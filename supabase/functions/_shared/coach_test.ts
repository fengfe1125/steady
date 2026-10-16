import { calendarOffset,buildPlan,buildReport,facts,metadata,modelRequest,statistics,validateRequest } from "./coach.ts";
import { aiRequest,validatePayload } from "./schema.ts";
import { generate } from "./generate.ts";
import { exerciseCatalog as lowerCatalog } from "./generated/exercise-catalog-v2.ts";
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

Deno.test("generate boundary classifies malformed model output without changing input or deliberate failures",async()=>{
 const originalFetch=globalThis.fetch;
 const environment=["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","DEEPSEEK_API_KEY","STEADY_PLAN_CATALOG_ENABLED","STEADY_LOWER_BODY_ENABLED"];
 const originalEnvironment=new Map(environment.map(key=>[key,Deno.env.get(key)]));
 const userID=crypto.randomUUID(),sessionID=crypto.randomUUID();
 const token=`e30.${btoa(JSON.stringify({session_id:sessionID}))}.synthetic`;
 let content="",malformedEnvelope=false,providerCalls=0;
 const completions:boolean[]=[];
 try {
  Deno.env.set("SUPABASE_URL","https://synthetic-project.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY","synthetic-server-key");
  Deno.env.set("DEEPSEEK_API_KEY","synthetic-provider-key");
  Deno.env.set("STEADY_PLAN_CATALOG_ENABLED","true");
  Deno.env.set("STEADY_LOWER_BODY_ENABLED","true");
  globalThis.fetch=(input,init)=>{
   const url=typeof input==="string"?input:input instanceof URL?input.href:input.url;
   if(url.endsWith("/auth/v1/user"))return Promise.resolve(Response.json({id:userID}));
   if(url.includes("/rest/v1/rpc/")) {
    if(url.endsWith("/finish_ai"))completions.push(JSON.parse(init!.body as string).ok);
    return Promise.resolve(Response.json({accepted:true}));
   }
   if(url==="https://api.deepseek.com/chat/completions") {
    providerCalls++;
    return Promise.resolve(malformedEnvelope?new Response("{"):
     Response.json({choices:[{finish_reason:"stop",message:{content}}],usage:{prompt_tokens:1,completion_tokens:1}}));
   }
   throw new Error("unexpected synthetic test request");
  };
  const base=request();
  const lower=aiRequest.parse({...base,planCatalogVersion:2,programKind:"lowerBodyBasics",preferences:{...base.preferences!,
   availableEquipmentIDs:["stable-chair","fixed-support"],movementConditions:lowerCatalog.conditions.map(c=>({conditionID:c.id,version:c.version,status:"ready"}))}});
  const misclassifiedRole={title:"下肢基础",sessions:[0,3].map(dayOffset=>({title:"训练",dayOffset,exercises:[
   {exerciseID:"march-in-place",role:"warmup"},{exerciseID:"unloaded-hip-hinge",role:"preparation"},
   {exerciseID:"chair-sit-to-stand",role:"main"},{exerciseID:"floor-glute-bridge",role:"main"},{exerciseID:"walk",role:"cooldown"}]}))};
  const cases=[
   {name:"malformed content JSON",route:"plan-draft" as const,body:JSON.stringify(base),content:"{",status:502,code:"invalid_output",calls:1},
   {name:"malformed provider envelope JSON",route:"plan-draft" as const,body:JSON.stringify(base),content:"{}",status:502,code:"invalid_output",calls:1,envelope:true},
   {name:"invalid plan shape",route:"plan-draft" as const,body:JSON.stringify(base),content:"{}",status:502,code:"invalid_output",calls:1},
   {name:"training slot confused with role",route:"plan-draft" as const,body:JSON.stringify(lower),content:JSON.stringify(misclassifiedRole),status:502,code:"invalid_output",calls:1},
   {name:"invalid report shape",route:"report" as const,body:JSON.stringify(base),content:"{}",status:502,code:"invalid_output",calls:1},
   {name:"deliberate unavailable result",route:"plan-draft" as const,body:JSON.stringify(lower),content:'{"unavailable":true}',status:400,code:"plan_conditions_insufficient",calls:1},
   {name:"invalid user request shape",route:"plan-draft" as const,body:JSON.stringify({...base,preferences:{...base.preferences!,availableMinutes:"30"}}),content:"{}",status:400,code:"invalid_input",calls:0},
   {name:"malformed user request JSON",route:"plan-draft" as const,body:"{",content:"{}",status:400,code:"invalid_input",calls:0},
  ];
  for(const test of cases) {
   content=test.content;malformedEnvelope=test.envelope??false;providerCalls=0;completions.length=0;
   const response=await generate(test.route)(new Request(`https://synthetic.test/${test.route}`,{method:"POST",
    headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:test.body}));
   const result=await response.json();
   assert(response.status===test.status&&result.code===test.code,`${test.name}: HTTP ${response.status}/${result.code}`);
   assert(providerCalls===test.calls,`${test.name}: provider boundary`);
   assert(JSON.stringify(completions)===JSON.stringify(test.calls?[false]:[]),`${test.name}: failed completion bookkeeping`);
  }
 } finally {
  globalThis.fetch=originalFetch;
  for(const key of environment) {const value=originalEnvironment.get(key);if(value===undefined)Deno.env.delete(key);else Deno.env.set(key,value);}
 }
});
