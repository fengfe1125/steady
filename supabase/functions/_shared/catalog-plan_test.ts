import { buildPlan, metadata, validateRequest } from "./coach.ts";
import { catalogPlanOptions, catalogPlanPrompt } from "./catalog-plan.ts";
import { aiRequest, plan, validatePayload } from "./schema.ts";
import { exerciseCatalog } from "./generated/exercise-catalog.ts";
import { exerciseCatalog as exerciseCatalogV2, exerciseCatalogHash as exerciseCatalogV2Hash } from "./generated/exercise-catalog-v2.ts";

function assert(ok: unknown, message = "assertion failed"): asserts ok { if (!ok) throw new Error(message); }
function rejects(work: () => unknown, message?: string) { let error: unknown; try { work(); } catch (caught) { error = caught; } assert(error instanceof Error, "expected rejection"); if (message) assert(error.message === message, `expected ${message}, got ${error.message}`); }
function enabled(work: () => void) { const old = Deno.env.get("STEADY_PLAN_CATALOG_ENABLED"); try { Deno.env.set("STEADY_PLAN_CATALOG_ENABLED", "true"); work(); } finally { if (old === undefined) Deno.env.delete("STEADY_PLAN_CATALOG_ENABLED"); else Deno.env.set("STEADY_PLAN_CATALOG_ENABLED", old); } }
function request() { return aiRequest.parse({requestID:crypto.randomUUID(),schemaVersion:1,planCatalogVersion:1,consent:{deviceID:crypto.randomUUID(),revision:1,healthRead:false,cloudSync:false,aiProcessing:true,policyVersion:"2026-09-23"},today:Date.now(),timeZoneID:"Asia/Shanghai",preferences:{metadata:metadata("manual"),goal:"建立运动习惯",experience:"初学者",equipment:"健身房",availableEquipmentIDs:exerciseCatalog.equipment.map(e=>e.id),availableMinutes:90,limitations:"",healthRead:false,cloudSync:false,aiProcessing:true,onboardingComplete:true}}); }
function valid(b = request()) { const options = catalogPlanOptions(b); for (const w of options.filter(x=>x.role==="warmup")) for (const m of options.filter(x=>x.role==="main"&&x.exerciseID!==w.exerciseID)) for (const c of options.filter(x=>x.role==="cooldown"&&x.exerciseID!==w.exerciseID&&x.exerciseID!==m.exerciseID)) if (w.estimatedSeconds+m.estimatedSeconds+c.estimatedSeconds<=b.preferences!.availableMinutes*60) return {title:"审核模板计划",sessions:[{title:"训练",dayOffset:0,exercises:[w,m,c].map(x=>({exerciseID:x.exerciseID,role:x.role}))}]}; throw new Error("fixture has no combination"); }

Deno.test("catalog rollout is disabled by default without breaking legacy generation", () => {
 const old=Deno.env.get("STEADY_PLAN_CATALOG_ENABLED"); try { Deno.env.delete("STEADY_PLAN_CATALOG_ENABLED"); const b=request(); rejects(()=>validateRequest(b,"plan-draft"),"plan_catalog_disabled"); const legacy={...b,planCatalogVersion:undefined}; assert(buildPlan({title:"旧草案",sessions:[{title:"训练",dayOffset:0,minutes:20,exerciseIDs:["walk","squat"]}]},legacy).status==="draft"); } finally { if(old===undefined)Deno.env.delete("STEADY_PLAN_CATALOG_ENABLED");else Deno.env.set("STEADY_PLAN_CATALOG_ENABLED",old); }
});
Deno.test("catalog requests require explicit known equipment and an unmodified audited combination", () => enabled(() => {
 const b=request(); rejects(()=>catalogPlanOptions({...b,preferences:{...b.preferences!,availableEquipmentIDs:null}}),"plan_equipment_required");
 rejects(()=>catalogPlanOptions({...b,preferences:{...b.preferences!,availableEquipmentIDs:["invented-machine"]}}),"invalid_input");
 rejects(()=>catalogPlanOptions({...b,preferences:{...b.preferences!,availableEquipmentIDs:["wall","wall"]}}),"invalid_input");
 rejects(()=>catalogPlanOptions({...b,preferences:{...b.preferences!,limitations:"疼痛"}}),"invalid_input");
 rejects(()=>catalogPlanOptions({...b,preferences:{...b.preferences!,availableEquipmentIDs:[],availableMinutes:10}}),"plan_conditions_insufficient");
}));
Deno.test("prompt only includes approved compatible role templates", () => enabled(() => {
 const b=request(),prompt=catalogPlanPrompt(b);
 for(const option of prompt.options){const item=exerciseCatalog.exercises.find(x=>x.id===option.exerciseID)!;assert(item.status==="approved");assert(item.experiences.includes(b.preferences!.experience));assert(item.equipment.every(id=>b.preferences!.availableEquipmentIDs!.includes(id)));assert(item.templates.some(t=>t.id===option.templateID&&t.experiences.includes(b.preferences!.experience)));}
 assert(prompt.catalogVersion===1);assert(prompt.catalogHash.length===64);
}));
Deno.test("catalog plan expands canonical content, preserves IDs and calculates template duration", () => enabled(() => {
 const b=request(),raw=valid(b),built=plan.parse(buildPlan(raw,b)); assert(built.status==="draft");
 const options=catalogPlanOptions(b);let seconds=0;
 for(const e of built.sessions[0].exercises){const option=options.find(x=>x.exerciseID===e.catalogID&&x.role===e.role)!;assert(e.name===option.name&&e.prescription===option.prescription&&e.templateID===option.templateID&&e.catalogVersion===1);seconds+=option.estimatedSeconds;}
 assert(built.sessions[0].minutes===Math.max(10,Math.ceil(seconds/60)));assert(built.generationContext!.availableMinutes===90);
 assert(new Set(built.sessions[0].exercises.map(e=>e.id)).size===3);
}));
Deno.test("catalog plan rejects missing phases, wrong order, duplicate movement/day and invented selections", () => enabled(() => {
 const b=request(),raw=valid(b),s=raw.sessions[0];
 rejects(()=>buildPlan({...raw,sessions:[{...s,exercises:[s.exercises[1],s.exercises[0],s.exercises[2]]}]},b));
 rejects(()=>buildPlan({...raw,sessions:[{...s,exercises:[s.exercises[0],s.exercises[1],s.exercises[1]]}]},b));
 rejects(()=>buildPlan({...raw,sessions:[{...s,exercises:[s.exercises[0],s.exercises[1]]}]},b));
 rejects(()=>buildPlan({...raw,sessions:[s,s]},b));
 rejects(()=>buildPlan({...raw,sessions:[{...s,exercises:[{exerciseID:"invented",role:"warmup"},s.exercises[1],s.exercises[2]]}]},b));
 rejects(()=>buildPlan({...raw,sessions:[{...s,minutes:10}]},b));
}));
Deno.test("schema accepts legacy absence and new explicit null while rejecting unknown properties", () => {
 const b=request();const built=buildPlan({title:"旧草案",sessions:[{title:"训练",dayOffset:0,minutes:20,exerciseIDs:["walk","squat"]}]},{...b,planCatalogVersion:undefined});
 assert(plan.safeParse(built).success);assert(plan.safeParse({...built,generationContext:null,sessions:built.sessions.map(s=>({...s,exercises:s.exercises.map(e=>({...e,catalogID:null,catalogVersion:null,templateID:null,role:null}))}))}).success);
 assert(!plan.safeParse({...built,unknown:"not allowed"}).success);assert(!aiRequest.safeParse({...b,planCatalogVersion:2}).success);
});
Deno.test("sync validates explicit catalog claims, dosage binding and duplicate UUIDs", () => enabled(() => {
 const b=request(),built=plan.parse(buildPlan(valid(b),b)),session=built.sessions[0];
 const record={id:session.metadata.id,kind:"sessions" as const,logicalID:session.metadata.id,parentID:built.metadata.id,payload:JSON.stringify(session),version:0,deleted:false};
 validatePayload(record);
 const mutated=(patch:Record<string,unknown>)=>({...record,payload:JSON.stringify({...session,exercises:session.exercises.map((e,i)=>i===0?{...e,...patch}:e)})});
 validatePayload(mutated({catalogID:"opaque-historical-id"}));rejects(()=>validatePayload(mutated({name:"different movement"})));rejects(()=>validatePayload(mutated({prescription:"100组"})));
 validatePayload(mutated({prescription:"用户修改剂量",templateID:null}));
 rejects(()=>validatePayload({...record,payload:JSON.stringify({...session,exercises:[session.exercises[0],session.exercises[0]]})}));
}));
Deno.test("catalog selections cannot exceed duration or use unavailable equipment", () => enabled(() => {
 const b=request(),raw=valid(b),options=catalogPlanOptions(b),s=raw.sessions[0];
 const chosen=s.exercises.map(e=>options.find(x=>x.exerciseID===e.exerciseID&&x.role===e.role)!);
 const seconds=chosen.reduce((sum,e)=>sum+e.estimatedSeconds,0);
 const extra=options.find(x=>x.role==="main"&&!s.exercises.some(e=>e.exerciseID===x.exerciseID)&&x.estimatedSeconds>59);
 assert(extra,"fixture needs an additional main movement");
 const tighter={...b,preferences:{...b.preferences!,availableMinutes:Math.max(10,Math.ceil(seconds/60))}};
 const tooLong={...raw,sessions:[{...s,exercises:[...s.exercises.slice(0,-1),{exerciseID:extra.exerciseID,role:extra.role},s.exercises.at(-1)!]}]};
 rejects(()=>buildPlan(tooLong,tighter),"invalid_output");
 const main=exerciseCatalog.exercises.find(x=>x.id===s.exercises[1].exerciseID)!;
 assert(main.equipment.length>0,"fixture main movement has a required device");
 const required:readonly string[]=main.equipment;
 const unequipped={...b,preferences:{...b.preferences!,availableEquipmentIDs:b.preferences!.availableEquipmentIDs!.filter(id=>!required.includes(id))}};
 rejects(()=>buildPlan(raw,unequipped));
}));
Deno.test("unsupported targets produce an explicit unavailable result instead of an upper-body substitute", () => enabled(() => {
 const b={...request(),preferences:{...request().preferences!,goal:"完整全身训练，重点练腿"}};
 const prompt=catalogPlanPrompt(b);
 assert(prompt.instruction.includes("不得称为完整全身或腿部计划"));
 assert(prompt.instruction.includes("不得硬凑上肢动作"));
 rejects(()=>buildPlan({unavailable:true},b),"plan_conditions_insufficient");
 rejects(()=>buildPlan({unavailable:true,reason:"自由理由"},b));
}));

Deno.test("sync preserves opaque historical IDs, versions and templates without weakening new generation", () => enabled(() => {
 const b=request(),built=plan.parse(buildPlan(valid(b),b)),session=built.sessions[0];
 const record={id:session.metadata.id,kind:"sessions" as const,logicalID:session.metadata.id,parentID:built.metadata.id,payload:JSON.stringify(session),version:3,deleted:false};
 for(const patch of [{catalogID:"future-movement",catalogVersion:999,templateID:"future-template"},{catalogVersion:999},{templateID:"retired-template",prescription:"历史用量原样保存"}]) {
  const payload={...session,scheduledAt:session.scheduledAt+86400000,feedback:{completed:true,perceivedEffort:4,note:"历史动作训练反馈",recordedAt:Date.now()},exercises:session.exercises.map((e,i)=>i===0?{...e,...patch}:e)};
  const candidate={...record,payload:JSON.stringify(payload)},before=JSON.stringify(candidate);
  validatePayload(candidate);assert(JSON.stringify(candidate)===before,"storage validation must not rewrite history");
 }
 const raw=valid(b),s=raw.sessions[0];
 rejects(()=>buildPlan({...raw,sessions:[{...s,exercises:[{exerciseID:"future-movement",role:"warmup"},...s.exercises.slice(1)]}]},b),"invalid_output");
}));

// The v1 catalog is immutable; v2 is selected explicitly with its own rollout gate.
function enabledV2(work: () => void) {
 const old=Deno.env.get("STEADY_LOWER_BODY_ENABLED");
 try { Deno.env.set("STEADY_LOWER_BODY_ENABLED","true"); work(); }
 finally { if(old===undefined)Deno.env.delete("STEADY_LOWER_BODY_ENABLED");else Deno.env.set("STEADY_LOWER_BODY_ENABLED",old); }
}
function requestV2() {
 const b=request();
 return aiRequest.parse({...b,planCatalogVersion:2,programKind:"lowerBodyBasics",preferences:{...b.preferences!,goal:"下肢基础训练",availableEquipmentIDs:exerciseCatalogV2.equipment.map(x=>x.id),movementConditions:exerciseCatalogV2.conditions.map(x=>({conditionID:x.id,version:x.version,status:"ready"}))}});
}
function validV2(b=requestV2()) {
 const options=catalogPlanOptions(b);
 for(const w of options.filter(x=>x.role==="warmup"&&x.trainingSlot!=="preparation")) for(const k of options.filter(x=>x.role==="main"&&x.trainingSlot==="kneeDominant")) for(const h of options.filter(x=>x.role==="main"&&x.trainingSlot==="hipDominant")) for(const c of options.filter(x=>x.role==="cooldown")) {
  const xs=[w,k,h,c],limit=b.preferences!.experience==="初学者"?8:10;
  if(new Set(xs.map(x=>x.exerciseID)).size===4 && xs.reduce((n,x)=>n+x.estimatedSeconds,90)<=b.preferences!.availableMinutes*60 && (k.workSets!+h.workSets!)<=limit) {
   const exercises=xs.map(x=>({exerciseID:x.exerciseID,role:x.role}));
   return {title:"下肢基础",sessions:[{title:"第一次",dayOffset:0,exercises},{title:"第二次",dayOffset:3,exercises}]};
  }
 }
 throw new Error("v2 fixture has no basic combination");
}
Deno.test("v2 request version and program are paired without changing v1 or legacy contracts",()=>{
 const b=request();
 assert(aiRequest.safeParse(requestV2()).success);
 assert(!aiRequest.safeParse({...b,planCatalogVersion:2}).success);
 assert(!aiRequest.safeParse({...b,programKind:"lowerBodyBasics"}).success);
 assert(!aiRequest.safeParse({...requestV2(),programKind:"upperBody"}).success);
 const old=Deno.env.get("STEADY_LOWER_BODY_ENABLED");
 try { Deno.env.delete("STEADY_LOWER_BODY_ENABLED");enabled(()=>{
  rejects(()=>validateRequest(requestV2(),"plan-draft"),"lower_body_disabled");
  assert(catalogPlanOptions(b).length>0);
 }); } finally {if(old===undefined)Deno.env.delete("STEADY_LOWER_BODY_ENABLED");else Deno.env.set("STEADY_LOWER_BODY_ENABLED",old);}
 enabledV2(()=>{
  const v1old=Deno.env.get("STEADY_PLAN_CATALOG_ENABLED");
  try {Deno.env.delete("STEADY_PLAN_CATALOG_ENABLED");assert(catalogPlanOptions(requestV2()).length>0);rejects(()=>catalogPlanOptions(b),"plan_catalog_disabled");}
  finally {if(v1old===undefined)Deno.env.delete("STEADY_PLAN_CATALOG_ENABLED");else Deno.env.set("STEADY_PLAN_CATALOG_ENABLED",v1old);}
 });
});
Deno.test("v2 filters equipment experience and exact ready conditions before prompt creation",()=>enabledV2(()=>{
 const b=requestV2(),options=catalogPlanOptions(b);
 for(const option of options) {
  const e=exerciseCatalogV2.exercises.find(x=>x.id===option.exerciseID)!;
  assert(e.status==="approved"&&e.experiences.includes(b.preferences!.experience));
  assert(e.equipment.every(id=>b.preferences!.availableEquipmentIDs!.includes(id)));
  assert(option.role!=="main"||option.trainingSlot!==undefined&&option.trainingSlot!=="preparation");
 }
 for(const status of ["unsure","unable"] as const) {
  const changed={...b,preferences:{...b.preferences!,movementConditions:b.preferences!.movementConditions!.map(x=>({...x,status}))}};
  rejects(()=>catalogPlanOptions(changed),"plan_conditions_insufficient");
 }
 for(const movementConditions of [null,undefined,[]]) rejects(()=>catalogPlanOptions({...b,preferences:{...b.preferences!,movementConditions}}),"plan_conditions_insufficient");
 for(const movementConditions of [[...b.preferences!.movementConditions!,b.preferences!.movementConditions![0]],[{conditionID:"future-condition",version:1,status:"ready" as const}],[{...b.preferences!.movementConditions![0],version:99}]]) rejects(()=>catalogPlanOptions({...b,preferences:{...b.preferences!,movementConditions}}),"invalid_input");
 const prompt=catalogPlanPrompt(b);assert(prompt.catalogVersion===2&&prompt.catalogHash===exerciseCatalogV2Hash);
 assert(prompt.instruction.includes("每周恰好2次")&&prompt.instruction.includes("每相邻动作30秒")&&prompt.instruction.includes("workSets"));
 rejects(()=>buildPlan({unavailable:true},b),"plan_conditions_insufficient");
}));
Deno.test("v2 expands canonical doses with transition time and complete confirmation history",()=>enabledV2(()=>{
 const b=requestV2();
 // An unused unsure answer remains in the stored explanation context.
 const unused=b.preferences!.movementConditions!.find(x=>x.conditionID==="rear-support-stable")!;
 unused.status="unsure";
 const raw=validV2(b),built=plan.parse(buildPlan(raw,b)),options=catalogPlanOptions(b);
 assert(built.sessions.length===2);
 assert(built.generationContext!.programKind==="lowerBodyBasics"&&built.generationContext!.rulesVersion===2);
 assert(JSON.stringify(built.generationContext!.movementConditions)===JSON.stringify(b.preferences!.movementConditions));
 for(const s of built.sessions) {
  const selected=s.exercises.map(e=>{const x=options.find(x=>x.exerciseID===e.catalogID&&x.role===e.role)!;assert(e.catalogVersion===2&&e.templateID===x.templateID&&e.prescription===x.prescription&&e.name===x.name);return x;});
  assert(s.minutes===Math.max(10,Math.ceil(selected.reduce((n,x)=>n+x.estimatedSeconds,30*(selected.length-1))/60)));
 }
}));
Deno.test("v2 requires two calendar-separated sessions and base pairs before auxiliary movements",()=>enabledV2(()=>{
 const b=requestV2(),raw=validV2(b),s=raw.sessions[0],options=catalogPlanOptions(b);
 rejects(()=>buildPlan({...raw,sessions:[s]},b),"invalid_output");
 rejects(()=>buildPlan({...raw,sessions:[s,{...s,dayOffset:1}]},b),"invalid_output");
 rejects(()=>buildPlan({...raw,sessions:[s,{...s,dayOffset:2},{...s,dayOffset:4}]},b),"invalid_output");
 assert(plan.parse(buildPlan({...raw,sessions:[s,{...s,dayOffset:2}]},b)).sessions.length===2);
 const aux=options.find(x=>x.role==="main"&&x.trainingSlot==="calf")!;assert(aux);
 const replace=(exercises:typeof s.exercises)=>({...raw,sessions:[{...s,exercises},raw.sessions[1]]});
 rejects(()=>buildPlan(replace([s.exercises[0],{exerciseID:aux.exerciseID,role:aux.role},s.exercises[2],s.exercises[3]]),b),"invalid_output");
 rejects(()=>buildPlan(replace([s.exercises[0],{exerciseID:aux.exerciseID,role:aux.role},...s.exercises.slice(1)]),b),"invalid_output");
 const preparation=options.find(x=>x.trainingSlot==="preparation");assert(preparation);
 rejects(()=>buildPlan(replace([{exerciseID:preparation.exerciseID,role:"warmup"},...s.exercises.slice(1)]),b),"invalid_output");
 assert(plan.parse(buildPlan(replace([s.exercises[0],{exerciseID:preparation.exerciseID,role:"warmup"},...s.exercises.slice(1)]),b)).sessions.length===2);
 rejects(()=>buildPlan(replace([s.exercises[0],{exerciseID:preparation.exerciseID,role:"main"},s.exercises[2],s.exercises[3]]),b),"invalid_output");
 const auxiliaries=options.filter(x=>x.role==="main"&&["calf","kneeFlexion","hipAdduction","hipAbduction","kneeExtension"].includes(x.trainingSlot??""));
 assert(auxiliaries.length>=3);
 rejects(()=>buildPlan(replace([...s.exercises.slice(0,-1),...auxiliaries.slice(0,3).map(x=>({exerciseID:x.exerciseID,role:x.role})),s.exercises.at(-1)!]),b),"invalid_output");
}));
Deno.test("v2 unilateral work is counted on both sides and enforces experience set caps",()=>enabledV2(()=>{
 for(const experience of ["初学者","偶尔运动","规律运动"] as const) {
  const b=requestV2();b.preferences!.experience=experience;
  const options=catalogPlanOptions(b),raw=validV2(b);
  const unilateral=options.filter(x=>x.role==="main").find(x=>{
   const e=exerciseCatalogV2.exercises.find(e=>e.id===x.exerciseID)!;return e.templates.some(t=>t.id===x.templateID&&t.perSide);
  });assert(unilateral,"fixture needs a unilateral main");
  const entry=exerciseCatalogV2.exercises.find(e=>e.id===unilateral.exerciseID)!;
  const t=entry.templates.find(t=>t.id===unilateral.templateID)!;
  assert(unilateral.workSets===t.sets!*2);
  const baseK=options.filter(x=>x.trainingSlot==="kneeDominant"),baseH=options.filter(x=>x.trainingSlot==="hipDominant");
  const aux=options.filter(x=>x.role==="main"&&["calf","kneeFlexion","hipAdduction","hipAbduction","kneeExtension"].includes(x.trainingSlot??""));
  let overCapChecked=false,atCapChecked=false;
  outer: for(const k of baseK) for(const h of baseH) for(const a of aux) for(const c of aux) {
   const mains=[k,h,a,c];
   if(new Set(mains.map(x=>x.exerciseID)).size!==4 || a.trainingSlot===c.trainingSlot)continue;
   const sets=mains.reduce((n,x)=>n+x.workSets!,0),cap=experience==="初学者"?8:10;
   const s=raw.sessions[0],exercises=[s.exercises[0],...mains.map(x=>({exerciseID:x.exerciseID,role:x.role})),s.exercises.at(-1)!];
   const candidate={...raw,sessions:[{...s,exercises},raw.sessions[1]]};
   if(sets>cap&&!overCapChecked){rejects(()=>buildPlan(candidate,b),"invalid_output");overCapChecked=true;}
   if(sets===cap&&!atCapChecked){assert(plan.parse(buildPlan(candidate,b)).sessions.length===2);atCapChecked=true;}
   if(overCapChecked&&atCapChecked)break outer;
  }
  assert(overCapChecked&&atCapChecked,"fixture must exercise both the exact work-set cap and an over-cap combination");
 }
}));
Deno.test("v2 transition overhead cannot be omitted or audited doses shrunk to fit",()=>enabledV2(()=>{
 const b=requestV2(),options=catalogPlanOptions(b),raw=validV2(b),s=raw.sessions[0];
 const chosen=s.exercises.map(e=>options.find(x=>x.exerciseID===e.exerciseID&&x.role===e.role)!);
 const seconds=chosen.reduce((n,x)=>n+x.estimatedSeconds,0);
 const budget=Math.max(10,Math.ceil(seconds/60));
 assert(seconds+30*(chosen.length-1)>budget*60,"fixture must distinguish transition overhead");
 rejects(()=>buildPlan(raw,{...b,preferences:{...b.preferences!,availableMinutes:budget}}));
 rejects(()=>buildPlan({...raw,sessions:[{...s,exercises:s.exercises.map(e=>({...e,prescription:"缩短为一组"}))},raw.sessions[1]]},b));
}));
Deno.test("v2 sync preserves future condition and context values while checking known movement dosage",()=>enabledV2(()=>{
 const b=requestV2(),built=plan.parse(buildPlan(validV2(b),b)),s=built.sessions[0];
 const sessionRecord={id:s.metadata.id,kind:"sessions" as const,logicalID:s.metadata.id,parentID:built.metadata.id,payload:JSON.stringify(s),version:0,deleted:false};
 validatePayload(sessionRecord);
 rejects(()=>validatePayload({...sessionRecord,payload:JSON.stringify({...s,exercises:s.exercises.map((e,i)=>i===1?{...e,prescription:"伪造剂量"}:e)})}),"invalid_input");
 const profile={...b.preferences!,movementConditions:[{conditionID:"future-condition",version:999,status:"unsure"}]};
 const profileRecord={id:profile.metadata.id,kind:"profiles" as const,logicalID:"profile",payload:JSON.stringify(profile),version:0,deleted:false};
 validatePayload(profileRecord);
 rejects(()=>validatePayload({...profileRecord,payload:JSON.stringify({...profile,movementConditions:[{conditionID:"future-condition",version:999,status:"approved"}]})}));
 const futurePlan={...built,sessions:[],generationContext:{...built.generationContext!,movementConditions:profile.movementConditions,programKind:"futureProgram",rulesVersion:999}};
 validatePayload({id:built.metadata.id,kind:"plans",logicalID:built.metadata.id,payload:JSON.stringify(futurePlan),version:0,deleted:false});
 assert(plan.safeParse({...built,generationContext:{...built.generationContext!,movementConditions:null,programKind:null,rulesVersion:null}}).success);
}));
Deno.test("v2 warmups and cooldowns are explicitly lower-body appropriate",()=>enabledV2(()=>{
 const b=requestV2();b.preferences!.experience="偶尔运动";
 const options=catalogPlanOptions(b),raw=validV2(b),s=raw.sessions[0];
 const warmups=["march-in-place","walk","unloaded-hip-hinge"],cooldowns=["walk","functional-cooldown-calf-stretch","functional-cooldown-hamstring-stretch"];
 assert(options.filter(x=>x.role==="warmup").every(x=>warmups.includes(x.exerciseID)));
 assert(options.filter(x=>x.role==="cooldown").every(x=>cooldowns.includes(x.exerciseID)));
 assert(options.filter(x=>x.role==="warmup").length===3);
 assert(options.filter(x=>x.role==="cooldown").length===3);
 const upperBodyWarmups=exerciseCatalogV2.exercises.filter(e=>e.templates.some(t=>t.role==="warmup"&&t.experiences.includes(b.preferences!.experience))&&!warmups.includes(e.id));
 assert(upperBodyWarmups.length>0);
 for(const e of upperBodyWarmups) {
  assert(!options.some(x=>x.exerciseID===e.id&&x.role==="warmup"));
  rejects(()=>buildPlan({...raw,sessions:[{...s,exercises:[{exerciseID:e.id,role:"warmup"},...s.exercises.slice(1)]},raw.sessions[1]]},b),"invalid_output");
  // An upper-body selection cannot be relabeled as cooldown either.
  rejects(()=>buildPlan({...raw,sessions:[{...s,exercises:[...s.exercises.slice(0,-1),{exerciseID:e.id,role:"cooldown"}]},raw.sessions[1]]},b),"invalid_output");
 }
 // v1 keeps its original choice of approved warmups.
 enabled(()=>{const v1=request();v1.preferences!.experience=b.preferences!.experience;assert(catalogPlanOptions(v1).some(x=>upperBodyWarmups.some(e=>e.id===x.exerciseID)));});
}));
Deno.test("v2 budget trims only optional auxiliaries and recalculates transition overhead",()=>enabledV2(()=>{
 const b=requestV2(),options=catalogPlanOptions(b),raw=validV2(b),s=raw.sessions[0];
 const base=s.exercises.map(e=>options.find(x=>x.exerciseID===e.exerciseID&&x.role===e.role)!);
 const auxiliaries=options.filter(x=>x.role==="main"&&["calf","kneeFlexion","hipAdduction","kneeExtension"].includes(x.trainingSlot??"")&&x.workSets===2).slice(0,2);
 assert(auxiliaries.length===2);
 const baseSeconds=base.reduce((n,x)=>n+x.estimatedSeconds,30*(base.length-1));
 const extended=[...s.exercises.slice(0,-1),...auxiliaries.map(x=>({exerciseID:x.exerciseID,role:x.role})),s.exercises.at(-1)!];
 const candidate={...raw,sessions:raw.sessions.map(s=>({...s,exercises:extended}))};
 for(const keep of [0,1]) {
  const expected=[...base.slice(0,-1),...auxiliaries.slice(0,keep),base.at(-1)!];
  const seconds=expected.reduce((n,x)=>n+x.estimatedSeconds,30*(expected.length-1));
  const budget=Math.max(10,Math.ceil(seconds/60));
  const built=plan.parse(buildPlan(candidate,{...b,preferences:{...b.preferences!,availableMinutes:budget}}));
  for(const session of built.sessions) {
   assert(JSON.stringify(session.exercises.map(x=>x.catalogID))===JSON.stringify(expected.map(x=>x.exerciseID)));
   assert(session.minutes===budget);
   assert(session.exercises.every((x,i)=>x.prescription===expected[i].prescription&&x.templateID===expected[i].templateID));
  }
 }
 // If the remaining base is too long, never delete a main, warmup or cooldown.
 const insufficient=Math.max(10,Math.ceil(baseSeconds/60)-1);
 assert(baseSeconds>insufficient*60);
 rejects(()=>buildPlan(candidate,{...b,preferences:{...b.preferences!,availableMinutes:insufficient}}));
 // Invalid structure is rejected, not repaired by trimming its third auxiliary.
 rejects(()=>buildPlan({...raw,sessions:raw.sessions.map(s=>({...s,exercises:[...extended.slice(0,-1),extended[extended.length-2],extended.at(-1)!]}))},b),"invalid_output");
}));

Deno.test("v2 auxiliary alternatives cannot occupy the same training slot twice",()=>enabledV2(()=>{
 const b=requestV2(),options=catalogPlanOptions(b),raw=validV2(b);
 const withAuxiliaries=(chosen:typeof options)=>({...raw,sessions:raw.sessions.map(s=>({...s,exercises:[...s.exercises.slice(0,-1),...chosen.map(x=>({exerciseID:x.exerciseID,role:x.role})),s.exercises.at(-1)!]}))});
 const calves=options.filter(x=>x.role==="main"&&x.trainingSlot==="calf");
 const curls=options.filter(x=>x.role==="main"&&x.trainingSlot==="kneeFlexion");
 assert(calves.length>=2&&curls.length>=2,"fixture needs both alternative pairs");
 for(const alternatives of [calves,curls]) {
  assert(alternatives[0].exerciseID!==alternatives[1].exerciseID);
  rejects(()=>buildPlan(withAuxiliaries(alternatives.slice(0,2)),b),"invalid_output");
 }
 const built=plan.parse(buildPlan(withAuxiliaries([calves[0],curls[0]]),b));
 assert(built.sessions.every(s=>s.exercises.filter(x=>x.role==="main").length===4));
 // Each alternative remains selectable individually; only redundant combinations fail.
 for(const alternative of [...calves,...curls]) assert(plan.parse(buildPlan(withAuxiliaries([alternative]),b)).sessions.length===2);
}));

Deno.test("v2 provider examples are valid complete combinations for each actual scene",()=>enabledV2(()=>{
 const scenes=[{equipment:"自重",ids:["stable-chair","fixed-support"],disabled:["basic-squat","split-stance"]},{equipment:"自重",ids:[],disabled:[]},{equipment:"哑铃",ids:["dumbbells"],disabled:["floor-access"]},{equipment:"健身房",ids:["leg-press-machine","leg-curl-machine"],disabled:["basic-squat","split-stance"]}];
 for(const scene of scenes) for(const experience of ["初学者","偶尔运动","规律运动"] as const) {
  const b=requestV2();Object.assign(b.preferences!,{equipment:scene.equipment,availableEquipmentIDs:scene.ids,experience,availableMinutes:30});
  b.preferences!.movementConditions=b.preferences!.movementConditions!.map(x=>({...x,status:scene.disabled.includes(x.conditionID)?"unable":"ready"}));
  const prompt=catalogPlanPrompt(b) as ReturnType<typeof catalogPlanPrompt>&{example?:unknown};
  assert(prompt.example,"v2 prompt must demonstrate one program-validated complete answer");
  const result=plan.parse(buildPlan(prompt.example,b));
  assert(result.sessions.length===2&&result.sessions.every(s=>s.minutes<=30));
  assert(prompt.instruction.includes("walk不能同时"));
  assert(prompt.options.every(x=>!("trainingSlot" in x)),"internal classification must not compete with role in provider options");
  assert(prompt.instruction.includes("role必须是warmup，不能是preparation"));
 }
}));
