import fs from 'node:fs';
import {makePose} from '/Volumes/Developer/Projects/steady/tools/action-library/pose.mjs';
const base=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const set=(s,p,v)=>{let o=s;const k=p.split('.');for(const x of k.slice(0,-1))o=o[x];o[k.at(-1)]=v;};
const tests=JSON.parse(process.argv[3]);
for(const t of tests){const s=structuredClone(base);for(const [p,v] of Object.entries(t))set(s,p,v);
 let ok=true,msg='';try{const pose=makePose(s);for(let i=0;i<=20;i++)pose(i/20);pose(s.mistake.level,s.mistake.override);}catch(e){ok=false;msg=e.message}
 console.log(JSON.stringify(t),ok?'OK':'FAIL '+msg);}
