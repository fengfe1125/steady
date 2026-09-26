#!/usr/bin/env python3
"""Synthetic HTTP integration tests. Never reads user API keys or sends provider requests."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import urllib.request
import urllib.error
import uuid
ROOT=Path(__file__).resolve().parents[1]
CLI=os.environ.get('STEADY_SUPABASE_CLI','supabase')
raw=subprocess.check_output([CLI,'status','-o','json'],cwd=ROOT,stderr=subprocess.DEVNULL)
config=json.loads(raw)
url=config['API_URL'];admin=config['SERVICE_ROLE_KEY'];anon=config['ANON_KEY']
assert url.startswith('http://127.0.0.1:55321'), 'Tests only support the dedicated local stack.'
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
