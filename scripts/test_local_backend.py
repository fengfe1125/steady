#!/usr/bin/env python3
"""Synthetic HTTP integration tests. Never reads user API keys or sends provider requests."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import urllib.request
import urllib.error
import uuid
import time
from urllib.parse import urlsplit
SOURCE_ROOT=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('STEADY_LOCAL_TEST_ROOT',str(SOURCE_ROOT))).resolve()
CLI=os.environ.get('STEADY_SUPABASE_CLI','supabase')
raw=subprocess.check_output([CLI,'status','-o','json'],cwd=ROOT,stderr=subprocess.DEVNULL)
config=json.loads(raw)
url=config['API_URL'];admin=config['SERVICE_ROLE_KEY'];anon=config['ANON_KEY']
parsed_url=urlsplit(url)
expected_port=int(os.environ.get('STEADY_LOCAL_TEST_PORT','55321'))
assert parsed_url.scheme=='http' and parsed_url.hostname=='127.0.0.1' and parsed_url.port==expected_port and not parsed_url.path and not parsed_url.query and not parsed_url.username, 'Tests only support the explicitly selected loopback stack.'
created=[]; passed=0
# Test traffic must stay on the dedicated loopback stack, even if macOS has a proxy.
local_http=urllib.request.build_opener(urllib.request.ProxyHandler({}))

def request(path,body=None,token=admin,method='POST'):
    data=None if body is None else json.dumps(body).encode()
    req=urllib.request.Request(url+path,data=data,method=method,headers={'Authorization':'Bearer '+token,'apikey':anon if token!=admin else admin,'Content-Type':'application/json'})
    try:
        with local_http.open(req,timeout=30) as response:
            text=response.read();return response.status,json.loads(text) if text else None
    except urllib.error.HTTPError as error:
        text=error.read()
        try:return error.code,json.loads(text)
        except:return error.code,{}

def check(condition,label):
    global passed
    if not condition:raise AssertionError(label)
    passed+=1;print('PASS '+label)

def user():
    email='steady-'+uuid.uuid4().hex+'@example.test';password=secrets.token_urlsafe(32)
    status,result=request('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True})
    assert status in [200,201], 'synthetic account creation'
    created.append(result['id'])
    status,result=request('/auth/v1/token?grant_type=password',{'email':email,'password':password},token=anon)
    assert status==200,'synthetic account login'
    return result['access_token']

def consent(revision=1,enabled=True):return {'deviceID':'cccccccc-cccc-4ccc-8ccc-cccccccccccc','revision':revision,'healthRead':True,'cloudSync':enabled,'aiProcessing':False,'policyVersion':'2026-09-23'}
def call(route,body,token):return request('/functions/v1/'+route,body,token=token)
try:
    a=user();b=user();c=consent()
    check(call('consents',c,a)[0]==200,'authenticated consent registration')
    check(call('consents',c,b)[0]==200,'second account registration')
    note={'id':str(uuid.uuid4()),'kind':'notes','logicalID':'2026-09-23','payload':json.dumps({'dayKey':'2026-09-23','text':'synthetic offline note'}),'version':0,'deleted':False}
    mutation={'id':str(uuid.uuid4()),'record':note,'attempt':0,'retryAt':0}
    status,result=call('sync-push',{'mutation':mutation,'consent':c},a)
    check(status==200 and result['record']['version']==1,'HTTP push assigns version')
    status,result=call('sync-push',{'mutation':mutation,'consent':c},a)
    check(status==200 and result['record']['version']==1,'HTTP retry is idempotent')
    status,result=call('sync-pull',{'cursor':0,'consent':c},b)
    check(status==200 and not result['records'],'HTTP account isolation')
    status,result=call('sync-pull',{'cursor':0,'consent':c},a)
    check(status==200 and len(result['records'])==1,'HTTP restore returns own record')
    invalid={**mutation,'id':str(uuid.uuid4()),'record':{**note,'payload':'{"dayKey":"wrong","text":"bad"}'}}
    check(call('sync-push',{'mutation':invalid,'consent':c},a)[0]==400,'malformed payload rejected before database')
    invalid={**mutation,'user_id':created[1]}
    check(call('sync-push',{'mutation':invalid,'consent':c},a)[0]==400,'forged owner field rejected')
    # Exercise a new-format plan through the actual Edge schema and atomic RPC merge.
    catalog=json.loads((SOURCE_ROOT/'Sources/SteadyCore/Resources/TrainingCollections/exercise-catalog.v1.json').read_text())
    entry=next(e for e in catalog['exercises'] if e['status']=='approved' and e['id']=='wall-push-up')
    template=next(t for t in entry['templates'] if t['role']=='main' and '初学者' in t['experiences'])
    def meta(rid):return {'id':rid,'createdAt':int(time.time()*1000),'updatedAt':int(time.time()*1000),'source':'manual','schemaVersion':1}
    plan_id=str(uuid.uuid4());session_id=str(uuid.uuid4())
    context={'experience':'初学者','availableEquipmentIDs':['wall'],'availableMinutes':25}
    plan={'metadata':meta(plan_id),'title':'Synthetic catalog plan','status':'draft','sessions':[],'generationContext':context}
    def push(kind,rid,payload,version=0,parent=None):
        record={'id':rid,'kind':kind,'logicalID':'profile' if kind=='profiles' else rid,'payload':json.dumps(payload),'version':version,'deleted':False}
        if parent:record['parentID']=parent
        return call('sync-push',{'consent':c,'mutation':{'id':str(uuid.uuid4()),'record':record,'attempt':0,'retryAt':0}},a)
    check(push('plans',plan_id,plan)[0]==200,'new plan context accepted by Edge')
    exercise={'id':str(uuid.uuid4()),'name':entry['name'],'prescription':template['prescription'],'catalogID':entry['id'],'catalogVersion':catalog['catalogVersion'],'templateID':template['id'],'role':'main'}
    session={'metadata':meta(session_id),'title':'Synthetic session','scheduledAt':int(time.time()*1000),'minutes':20,'exercises':[exercise]}
    check(push('sessions',session_id,session,parent=plan_id)[0]==200,'catalog references accepted by Edge')
    legacy_exercise={k:v for k,v in exercise.items() if k not in ['catalogID','catalogVersion','templateID','role']}
    legacy={**session,'exercises':[legacy_exercise],'feedback':{'completed':True,'perceivedEffort':4,'note':'legacy feedback','recordedAt':int(time.time()*1000)}}
    status,result=push('sessions',session_id,legacy,1,plan_id)
    saved=json.loads(result['record']['payload']) if status==200 else {}
    check(status==200 and saved['exercises'][0]['catalogID']==entry['id'] and saved['exercises'][0]['templateID']==template['id'],'legacy feedback round-trip preserves catalog and template')
    edited={**legacy,'exercises':[{**legacy_exercise,'prescription':'用户调整处方'}]}
    status,result=push('sessions',session_id,edited,2,plan_id)
    saved=json.loads(result['record']['payload']) if status==200 else {}
    check(status==200 and saved['exercises'][0]['catalogID']==entry['id'] and saved['exercises'][0]['templateID'] is None,'legacy dosage edit keeps animation and clears template')
    renamed={**legacy,'exercises':[{**legacy_exercise,'name':'用户替换动作'}]}
    status,result=push('sessions',session_id,renamed,3,plan_id)
    saved=json.loads(result['record']['payload']) if status==200 else {}
    check(status==200 and saved['exercises'][0]['catalogID'] is None,'legacy rename does not retain wrong animation')
    cleared={**session,'exercises':[{**legacy_exercise,'catalogID':None,'catalogVersion':None,'templateID':None,'role':None}]}
    status,result=push('sessions',session_id,cleared,4,plan_id)
    check(status==200 and json.loads(result['record']['payload'])['exercises'][0]['catalogID'] is None,'explicit unlink survives Edge and RPC')
    status,result=push('plans',plan_id,{k:v for k,v in plan.items() if k!='generationContext'},1)
    check(status==200 and json.loads(result['record']['payload'])['generationContext']==context,'legacy plan header retains generation context')
    status,result=call('sync-pull',{'cursor':0,'consent':c},a)
    restored=[r for r in result.get('records',[]) if r['id']==session_id] if status==200 else []
    check(bool(restored) and json.loads(restored[-1]['payload'])['exercises'][0]['catalogID'] is None,'HTTP restore returns final explicit unlink')
    invalid_link={**session,'exercises':[{**exercise,'name':'错误动作名称'}]}
    check(push('sessions',session_id,invalid_link,5,plan_id)[0]==400,'known catalog ID cannot claim a different movement name')
    invalid_dosage={**session,'exercises':[{**exercise,'prescription':'伪造审核用量'}]}
    check(push('sessions',session_id,invalid_dosage,5,plan_id)[0]==400,'known template cannot claim altered dosage')
    future_id=str(uuid.uuid4())
    future_exercise={**exercise,'id':str(uuid.uuid4()),'catalogID':'future-action','catalogVersion':999,'templateID':'future-template','name':'未来动作文字','prescription':'原来的历史用量'}
    future={**session,'metadata':meta(future_id),'exercises':[future_exercise]}
    check(push('sessions',future_id,future,parent=plan_id)[0]==200,'opaque future catalog references can be stored')
    future_edit={**future,'scheduledAt':future['scheduledAt']+86400000,'feedback':{'completed':True,'perceivedEffort':3,'note':'历史动作反馈','recordedAt':int(time.time()*1000)}}
    status,result=push('sessions',future_id,future_edit,1,plan_id)
    saved=json.loads(result['record']['payload']) if status==200 else {}
    check(status==200 and saved['exercises']==[future_exercise] and saved['feedback']==future_edit['feedback'] and saved['scheduledAt']==future_edit['scheduledAt'],'future references survive date and feedback round-trip unchanged')
    status,result=call('sync-pull',{'cursor':0,'consent':c},a)
    future_restored=[r for r in result.get('records',[]) if r['id']==future_id] if status==200 else []
    check(bool(future_restored) and json.loads(future_restored[-1]['payload'])['exercises']==[future_exercise],'HTTP restore preserves unknown ID version and template')
    historical_id=str(uuid.uuid4())
    historical={**session,'metadata':meta(historical_id),'exercises':[{**exercise,'templateID':'retired-template','prescription':'历史模板用量原样保存'}]}
    status,result=push('sessions',historical_id,historical,parent=plan_id)
    check(status==200 and json.loads(result['record']['payload'])['exercises']==historical['exercises'],'known movement with opaque historical template remains synchronizable')
    ai_body={'requestID':str(uuid.uuid4()),'schemaVersion':1,'planCatalogVersion':1,'consent':c,'today':int(time.time()*1000),'timeZoneID':'Asia/Shanghai','preferences':{'metadata':meta(str(uuid.uuid4())),'goal':'建立运动习惯','experience':'初学者','equipment':'自重','availableEquipmentIDs':['wall'],'availableMinutes':25,'limitations':'','healthRead':False,'cloudSync':False,'aiProcessing':False,'onboardingComplete':True}}
    status,result=call('plan-draft',ai_body,a)
    check(status==503 and result.get('code')=='plan_catalog_disabled','disabled rollout rejects new generation explicitly before provider call')
    # v2 movement confirmations and program context cross the same Edge/RPC boundary.
    v2_catalog_bytes=(SOURCE_ROOT/'Sources/SteadyCore/Resources/TrainingCollections/exercise-catalog.v2.json').read_bytes()
    catalog_v2=json.loads(v2_catalog_bytes)
    print('Catalog v2 SHA256='+hashlib.sha256(v2_catalog_bytes).hexdigest())
    confirmations=[{'conditionID':item['id'],'version':item['version'],'status':'ready'} for item in catalog_v2['conditions']]
    context_v2={**context,'movementConditions':confirmations,'programKind':'lowerBodyBasics','rulesVersion':2}
    v2_plan_id=str(uuid.uuid4());v2_session_id=str(uuid.uuid4());profile_id=str(uuid.uuid4())
    v2_plan={**plan,'metadata':meta(v2_plan_id),'generationContext':context_v2}
    check(push('plans',v2_plan_id,v2_plan)[0]==200,'v2 program and full confirmation context accepted')
    v1_header={**v2_plan,'title':'v1 changed title','generationContext':context}
    status,result=push('plans',v2_plan_id,v1_header,1)
    check(status==200 and json.loads(result['record']['payload'])['generationContext']==context_v2,'v1 nested context round-trip retains v2 conditions and rules')
    context_clear={**context,'movementConditions':None}
    status,result=push('plans',v2_plan_id,{**v2_plan,'generationContext':context_clear},2)
    saved=json.loads(result['record']['payload']) if status==200 else {}
    check(status==200 and saved['generationContext']['movementConditions'] is None and saved['generationContext']['programKind']=='lowerBodyBasics' and saved['generationContext']['rulesVersion']==2,'nested condition clear preserves omitted program fields')
    lower=next(e for e in catalog_v2['exercises'] if e.get('trainingSlot')=='kneeDominant' and e['status']=='approved' and any(t['role']=='main' and '初学者' in t['experiences'] for t in e['templates']))
    lower_template=next(t for t in lower['templates'] if t['role']=='main' and '初学者' in t['experiences'])
    lower_exercise={**exercise,'id':str(uuid.uuid4()),'name':lower['name'],'prescription':lower_template['prescription'],'catalogID':lower['id'],'catalogVersion':2,'templateID':lower_template['id']}
    lower_session={**session,'metadata':meta(v2_session_id),'exercises':[lower_exercise]}
    status,result=push('sessions',v2_session_id,lower_session,parent=v2_plan_id)
    check(status==200,f'v2 known movement and template accepted for sync (status={status}, code={result.get("code")})')
    check(push('sessions',v2_session_id,{**lower_session,'exercises':[{**lower_exercise,'prescription':'伪造v2用量'}]},1,v2_plan_id)[0]==400,'v2 known template rejects forged dosage')
    profile={**ai_body['preferences'],'metadata':meta(profile_id),'movementConditions':confirmations+[{'conditionID':'future-condition','version':999,'status':'unsure'}]}
    check(push('profiles',profile_id,profile)[0]==200,'profile transports unknown future condition history')
    old_profile={k:v for k,v in profile.items() if k!='movementConditions'}
    status,result=push('profiles',profile_id,old_profile,1)
    check(status==200 and json.loads(result['record']['payload'])['movementConditions']==profile['movementConditions'],'old profile write retains all confirmation history')
    scene_profile={k:v for k,v in old_profile.items() if k!='availableEquipmentIDs'};scene_profile['equipment']='健身房'
    status,result=push('profiles',profile_id,scene_profile,2)
    saved=json.loads(result['record']['payload']) if status==200 else {}
    check(status==200 and saved['movementConditions']==profile['movementConditions'] and saved['availableEquipmentIDs'] is None,'scene change retains conditions while clearing omitted inventory')
    status,result=push('profiles',profile_id,{**scene_profile,'movementConditions':None},3)
    check(status==200 and json.loads(result['record']['payload'])['movementConditions'] is None,'explicit profile condition null remains authoritative')
    invalid_conditions={**scene_profile,'movementConditions':[{'conditionID':'hip-hinge','version':1,'status':'approved'}]}
    check(push('profiles',profile_id,invalid_conditions,4)[0]==400,'condition status remains strict at Edge')
    ai_v2={**ai_body,'planCatalogVersion':2,'programKind':'lowerBodyBasics','preferences':{**ai_body['preferences'],'availableEquipmentIDs':[e['id'] for e in catalog_v2['equipment']],'movementConditions':confirmations}}
    if os.environ.get('STEADY_LOCAL_LOWER_BODY_ENABLED')=='true':
        for test_conditions,expected,label in [
            ([], 'plan_conditions_insufficient', 'unconfirmed lower-body conditions reject before provider'),
            ([{'conditionID':'future-condition','version':999,'status':'ready'}], 'invalid_input', 'unknown generation condition rejects before provider'),
            (confirmations+[confirmations[0]], 'invalid_input', 'duplicate generation condition rejects before provider'),
            ([{**confirmations[0],'version':999}], 'invalid_input', 'wrong condition version rejects before provider')]:
            status,result=call('plan-draft',{**ai_v2,'preferences':{**ai_v2['preferences'],'movementConditions':test_conditions}},a)
            check(status==400 and result.get('code')==expected,label)
    else:
        status,result=call('plan-draft',ai_v2,a)
        check(status==503 and result.get('code')=='lower_body_disabled','v2 independent gate rejects before any provider call')
    check(call('plan-draft',{k:v for k,v in ai_v2.items() if k!='programKind'},a)[0]==400,'v2 request requires matching program kind')
    off=consent(2,False)
    check(call('consents',off,a)[0]==200,'consent revocation accepted')
    check(call('sync-pull',{'cursor':0,'consent':c},a)[0]==409,'old consent revision cannot authorize sync')
    check(call('consents',c,a)[0]==409,'old device request cannot regrant withdrawn consent')
    check(call('sync-pull',{'cursor':0,'consent':c},anon)[0] in [401,403],'anonymous caller rejected')
    check(call('account-delete',{'emailCode':'000000'},a)[0]==401,'incorrect deletion OTP cannot delete account')
    status,owner=request('/auth/v1/admin/users/'+created[0],method='GET')
    assert status==200
    status,link=request('/auth/v1/admin/generate_link',{'type':'magiclink','email':owner['email']})
    assert status==200 and link.get('email_otp'),'local synthetic OTP generation'
    check(call('account-delete',{'emailCode':link['email_otp']},a)[0]==200,'verified email deletion succeeds')
    check(call('consents',c,a)[0]==401,'deleted account token rejected')
    uid=created.pop(0)
    status,result=request('/rest/v1/records?user_id=eq.'+uid,method='GET')
    check(status==200 and result==[],'account deletion cascades business records')
    print(f'{passed} HTTP integration checks passed; no AI provider was called.')
finally:
    for uid in created:
        status,_=request('/auth/v1/admin/users/'+uid,method='DELETE')
        if status not in [200,204]:print('Synthetic test account cleanup failed; inspect local stack.')
