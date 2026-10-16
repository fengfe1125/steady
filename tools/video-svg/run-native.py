#!/usr/bin/env python3
"""Explicit QA simulator only. Never installs to a physical device or erases a simulator."""
import argparse,subprocess,pathlib,time,json,shutil
p=argparse.ArgumentParser();p.add_argument('--set',required=True);p.add_argument('--device',required=True);p.add_argument('--app',required=True);a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[2];out=root/'docs/verification/video-svg-phase1/native';out.mkdir(parents=True,exist_ok=True)
sim=['xcrun','simctl','--set',a.set];uid=a.device
subprocess.run(sim+['install',uid,a.app],check=True)
base=pathlib.Path(subprocess.check_output(sim+['get_app_container',uid,'com.jiwo.steady','data'],text=True).strip())/'Documents'
rows=json.loads((root/'Sources/SteadyCore/Resources/TrainingCollections/VideoReferences/lessons.json').read_text());results=[]
for row in rows:
 id=row['id'];path=base/f'reference-{id}-audit.json'
 if path.exists():path.unlink() # own prior QA report only
 subprocess.run(sim+['launch','--terminate-running-process',uid,'com.jiwo.steady','--ui-preview','video-reference-'+id,'--video-reference-audit'],check=True,stdout=subprocess.DEVNULL)
 deadline=time.monotonic()+30
 while not path.exists() and time.monotonic()<deadline:time.sleep(.2)
 if not path.exists():raise RuntimeError('Audit timed out '+id)
 d=json.loads(path.read_text());assert 'error' not in d,d;assert not d['geometry']['errors'],d;assert d['normal']['time']>200,d;assert d['pauseStart']['time']==d['pauseEnd']['time'],d;assert .25<d['slow']['time']/d['normal']['time']<.8,d;assert d['detailFrames']==4 and d['detailFits'],d
 for f in base.glob('reference-'+id+'-*'):shutil.copy2(f,out/f.name)
 for mode in ['motion','detail','mistakes']:
  extra=[] if mode=='motion' else ['--reference-'+mode]
  subprocess.run(sim+['launch','--terminate-running-process',uid,'com.jiwo.steady','--ui-preview','video-reference-'+id,'--training-reduce-motion']+extra,check=True,stdout=subprocess.DEVNULL)
  time.sleep(1.1)
  temp=pathlib.Path('/tmp')/('steady-phase1-'+id+'-'+mode+'.png')
  subprocess.run(sim+['io',uid,'screenshot',str(temp)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  shutil.copy2(temp,out/(id+'-ui-'+mode+'.png'))
 results.append({'id':id,'status':'passed','samples':101,'normalMS':d['normal']['time'],'halfSpeedMS':d['slow']['time'],'detailFits':d['detailFits']});print(id,'PASS',flush=True)
(out/'acceptance.json').write_text(json.dumps(results,indent=2))
