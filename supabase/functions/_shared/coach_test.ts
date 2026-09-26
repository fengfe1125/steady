import { calendarOffset,buildPlan,buildReport,facts,metadata,modelRequest,statistics,validateRequest } from "./coach.ts";
import { aiRequest,validatePayload } from "./schema.ts";
function assert(ok:unknown,message="assertion failed"):asserts ok {if(!ok)throw new Error(message);}
function rejects(work:()=>unknown){let threw=false;try{work();}catch{threw=true;}assert(threw);}
const s={metadata:{...metadata("healthKit"),revision:2},dayKey:"2026-09-23",timeZoneID:"Asia/Shanghai",date:Date.now(),weightKG:70,sleepMinutes:420,steps:5000,activeMinutes:20};
function request(){return aiRequest.parse({requestID:crypto.randomUUID(),schemaVersion:1,consent:{deviceID:crypto.randomUUID(),revision:1,healthRead:true,cloudSync:false,aiProcessing:true,policyVersion:"2026-09-23"},summary:s,history:[s],today:Date.now(),timeZoneID:"Asia/Shanghai",preferences:{metadata:metadata("manual"),goal:"建立运动习惯",experience:"初学者",equipment:"自重",availableMinutes:25,limitations:"",healthRead:true,cloudSync:false,aiProcessing:true,onboardingComplete:true}});}
Deno.test("missing metrics never become zero; evidence stays versioned",()=>{
 assert(facts([{...s,steps:null,sleepMinutes:null,weightKG:null,activeMinutes:null}]).length===0);
 assert(facts([s]).every(r=>r.summaryVersion===2));
 assert(statistics([{...s,sleepMinutes:null}])[1].mean===null);
 rejects(()=>validateRequest({...request(),summary:{...s,steps:null,sleepMinutes:null,weightKG:null,activeMinutes:null}},"report"));
});
Deno.test("report rejects invented evidence and replaces quantitative prose",()=>{
 const b=request(),refs=facts([s]);
 const output={sections:["数据观察","个人趋势","缺失信息","下一步建议"].map(title=>({title,body:"假设步数99999",factIDs:[] as string[]}))};
 const built=buildReport(output,b,refs);assert(!built.sections[0].body.includes("99999"));
 output.sections[0].factIDs=[crypto.randomUUID()];rejects(()=>buildReport(output,b,refs));
 rejects(()=>buildReport({},b,refs));
});
Deno.test("plan rejects unavailable equipment, restrictions, duplicates and oversized sessions",()=>{
 const b=request(),valid={title:"轻量训练",sessions:[{title:"训练",dayOffset:0,minutes:20,exerciseIDs:["walk","squat"]}]};
 assert(buildPlan(valid,b).status==="draft");
 rejects(()=>buildPlan({...valid,sessions:[{...valid.sessions[0],exerciseIDs:["dumbbell-row"]}]},b));
 rejects(()=>buildPlan({...valid,sessions:[{...valid.sessions[0],minutes:90}]},b));
 rejects(()=>buildPlan({...valid,sessions:[valid.sessions[0],valid.sessions[0]]},b));
 rejects(()=>buildPlan(valid,{...b,preferences:{...b.preferences!,limitations:"疼痛"}}));
});
Deno.test("sync payload rejects demo records and mismatched identity",()=>{
 const id=crypto.randomUUID();
 rejects(()=>validatePayload({id,kind:"summaries",logicalID:"2026-09-23|Asia/Shanghai",payload:JSON.stringify({...s,metadata:{...s.metadata,source:"demo"}}),version:0,deleted:false}));
 rejects(()=>validatePayload({id,kind:"summaries",logicalID:"wrong-day",payload:JSON.stringify(s),version:0,deleted:false}));
});

Deno.test("training dates follow local calendar across daylight saving",()=>{
 const start=Date.parse("2026-03-07T17:00:00Z");
 assert(calendarOffset(start,1,"America/New_York")===Date.parse("2026-03-08T16:00:00Z"));
 assert(calendarOffset(start,1,"Asia/Shanghai")===start+86400000);
});

Deno.test("DeepSeek HTTP failure and timeout stop AI requests",async()=>{
 const originalFetch=globalThis.fetch,originalKey=Deno.env.get("DEEPSEEK_API_KEY");
 const b={...request(),question:"请简短回答。"};
 try {
  Deno.env.set("DEEPSEEK_API_KEY","synthetic-test-key");
  globalThis.fetch=()=>Promise.resolve(new Response("provider error",{status:503}));
  let failed=false;
  try { await modelRequest("chat",b,new AbortController().signal); }
  catch(error) { failed=error instanceof Error&&error.message==="provider_unavailable"; }
  assert(failed,"provider failure should be mapped to unavailable");
  globalThis.fetch=(_input,init)=>new Promise<Response>((_resolve,reject)=>{
   const signal=init?.signal as AbortSignal;
   signal.addEventListener("abort",()=>reject(signal.reason),{once:true});
  });
  let timedOut=false;
  try { await modelRequest("chat",b,AbortSignal.timeout(20)); }
  catch(error) { timedOut=error instanceof DOMException&&error.name==="TimeoutError"; }
  assert(timedOut,"timeout should abort provider fetch");
 } finally {
  globalThis.fetch=originalFetch;
  if(originalKey===undefined) Deno.env.delete("DEEPSEEK_API_KEY");
  else Deno.env.set("DEEPSEEK_API_KEY",originalKey);
 }
});
