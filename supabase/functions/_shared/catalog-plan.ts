import { z } from "zod";
import { Failure } from "./http.ts";
import type { AIRequest } from "./coach.ts";
import { exerciseCatalog, exerciseCatalogHash } from "./generated/exercise-catalog.ts";
import { exerciseCatalog as exerciseCatalogV2, exerciseCatalogHash as exerciseCatalogV2Hash } from "./generated/exercise-catalog-v2.ts";

const roles = ["warmup", "main", "cooldown"] as const;
type Role = typeof roles[number];
const lowerBodySlots = ["kneeDominant", "hipDominant", "kneeFlexion", "calf", "hipAdduction", "hipAbduction", "kneeExtension", "preparation"] as const;
type TrainingSlot = typeof lowerBodySlots[number];
const auxiliarySlots: readonly string[] = ["kneeFlexion", "calf", "hipAdduction", "hipAbduction", "kneeExtension"];
const lowerBodyWarmups: readonly string[] = ["march-in-place", "walk", "unloaded-hip-hinge"];
const lowerBodyCooldowns: readonly string[] = ["walk", "functional-cooldown-calf-stretch", "functional-cooldown-hamstring-stretch"];
const catalogSchema = z.object({ catalogVersion:z.number().int().positive(), equipment:z.array(z.object({id:z.string()})),
 conditions:z.array(z.object({id:z.string(),version:z.number().int().positive()})).default([]), exercises:z.array(z.object({
 id:z.string(),name:z.string(),status:z.enum(["approved","learningOnly"]),equipment:z.array(z.string()),experiences:z.array(z.string()),
 requiredConditions:z.array(z.string()).default([]),trainingSlot:z.enum(lowerBodySlots).optional(),
 templates:z.array(z.object({id:z.string(),role:z.enum(roles),experiences:z.array(z.string()),estimatedSeconds:z.number().int().positive(),prescription:z.string().min(1),sets:z.number().int().positive().optional(),perSide:z.boolean().default(false)}))
})) });
const catalog = catalogSchema.parse(exerciseCatalog), catalogV2 = catalogSchema.parse(exerciseCatalogV2);
export type PlanOption = { exerciseID: string; name: string; role: Role; templateID: string; estimatedSeconds: number; prescription: string; trainingSlot?: TrainingSlot; workSets?: number };

function isLowerBody(b: AIRequest) { return b.planCatalogVersion === 2; }
function workSetLimit(b: AIRequest) { return b.preferences!.experience === "初学者" ? 8 : 10; }
function sessionSeconds(options: PlanOption[], lowerBody: boolean) {
 return options.reduce((sum,x)=>sum+x.estimatedSeconds,0) + (lowerBody ? Math.max(0,options.length-1)*30 : 0);
}
function lowerBodyMainsValid(options: PlanOption[], b: AIRequest) {
 const mains = options.filter(x=>x.role==="main");
 return mains.length>=2 && mains.length<=4
  && mains.filter(x=>x.trainingSlot==="kneeDominant").length===1
  && mains.filter(x=>x.trainingSlot==="hipDominant").length===1
  && mains.slice(0,2).every(x=>x.trainingSlot==="kneeDominant" || x.trainingSlot==="hipDominant")
  && mains.slice(2).every(x=>auxiliarySlots.includes(x.trainingSlot ?? ""))
  && new Set(mains.slice(2).map(x=>x.trainingSlot)).size===mains.length-2
  && mains.every(x=>(x.workSets ?? 0)>0)
  && mains.reduce((sum,x)=>sum+x.workSets!,0)<=workSetLimit(b);
}

// Reuse the same feasible base for preflight and for a concrete provider example.
// The model response still passes every independent rule; this is never a fallback.
function lowerBodyBase(options: PlanOption[], b: AIRequest): PlanOption[] | undefined {
 for (const w of options.filter(x=>x.role==="warmup"&&x.trainingSlot!=="preparation"))
  for (const k of options.filter(x=>x.role==="main"&&x.trainingSlot==="kneeDominant"))
   for (const h of options.filter(x=>x.role==="main"&&x.trainingSlot==="hipDominant"))
    for (const c of options.filter(x=>x.role==="cooldown")) {
     const xs=[w,k,h,c];
     if(new Set(xs.map(x=>x.exerciseID)).size===xs.length&&lowerBodyMainsValid(xs,b)&&sessionSeconds(xs,true)<=b.preferences!.availableMinutes*60) return xs;
    }
 return undefined;
}

export function catalogPlanOptions(b: AIRequest): PlanOption[] {
 const lowerBody = isLowerBody(b), selectedCatalog = lowerBody ? catalogV2 : catalog;
 if (lowerBody) {
  if (b.programKind!=="lowerBodyBasics") throw new Failure("invalid_input");
  if (Deno.env.get("STEADY_LOWER_BODY_ENABLED") !== "true") throw new Failure("lower_body_disabled",503);
 } else if (Deno.env.get("STEADY_PLAN_CATALOG_ENABLED") !== "true") throw new Failure("plan_catalog_disabled", 503);
 const prefs = b.preferences;
 if (!prefs || prefs.limitations.trim()) throw new Failure("invalid_input");
 if (prefs.availableEquipmentIDs == null) throw new Failure("plan_equipment_required");
 const equipment = new Set(prefs.availableEquipmentIDs);
 if (equipment.size !== prefs.availableEquipmentIDs.length || [...equipment].some(id => !selectedCatalog.equipment.some(x => x.id === id))) throw new Failure("invalid_input");
 const confirmations = prefs.movementConditions ?? [];
 if (lowerBody && (new Set(confirmations.map(x=>x.conditionID)).size!==confirmations.length || confirmations.some(x=>!selectedCatalog.conditions.some(c=>c.id===x.conditionID && c.version===x.version)))) throw new Failure("invalid_input");
 const options = selectedCatalog.exercises.filter(e => e.status === "approved" && e.experiences.includes(prefs.experience) && e.equipment.every(id => equipment.has(id))
  && (!lowerBody || e.requiredConditions.every(id=>confirmations.some(c=>c.conditionID===id && c.status==="ready" && c.version===selectedCatalog.conditions.find(x=>x.id===id)?.version))))
  .flatMap(e => e.templates.filter(t => t.experiences.includes(prefs.experience)
   && (!lowerBody || (t.role==="warmup" ? lowerBodyWarmups.includes(e.id)
    : t.role==="cooldown" ? lowerBodyCooldowns.includes(e.id)
    : e.trainingSlot!==undefined && e.trainingSlot!=="preparation" && t.sets!==undefined)))
   .map(t => ({ exerciseID:e.id,name:e.name,role:t.role,templateID:t.id,estimatedSeconds:t.estimatedSeconds,prescription:t.prescription,
    ...(lowerBody ? {trainingSlot:e.trainingSlot,workSets:t.role==="main" ? t.sets!*(t.perSide?2:1) : 0} : {}) })));
 // Test existence before calling AI. Audited doses are never shortened to fit.
 const grouped = roles.map(role => options.filter(x => x.role === role)), budget = prefs.availableMinutes * 60;
 const distinct = (xs:PlanOption[])=>new Set(xs.map(x=>x.exerciseID)).size===xs.length;
 const possible = lowerBody
  ? lowerBodyBase(options,b)!==undefined
  : grouped[0].some(w => grouped[1].some(m => grouped[2].some(c=>{const xs=[w,m,c];return distinct(xs)&&sessionSeconds(xs,false)<=budget;})));
 if (!possible) throw new Failure("plan_conditions_insufficient");
 return options;
}

const planOutput = z.object({ title: z.string().min(1).max(80), sessions: z.array(z.object({
 title: z.string().min(1).max(80), dayOffset: z.number().int().min(0).max(6),
 exercises: z.array(z.object({ exerciseID: z.string(), role: z.enum(roles) }).strict()).min(3).max(20),
}).strict()).min(1).max(7) }).strict();

export function catalogPlanPrompt(b: AIRequest) {
 const lowerBody = isLowerBody(b), options=catalogPlanOptions(b);
 const base=lowerBody ? lowerBodyBase(options,b)! : undefined;
 const example=base ? {title:"下肢基础训练",sessions:[0,3].map(dayOffset=>({title:"下肢基础训练",dayOffset,exercises:base.map(x=>({exerciseID:x.exerciseID,role:x.role}))}))} : undefined;
 const promptOptions=lowerBody ? options.map(({trainingSlot,...option})=>({...option,...(option.role==="main"?{mainPattern:trainingSlot}:{})})) : options;
 const instruction = lowerBody
  ? "返回 JSON：title、sessions。下肢基础计划每周恰好2次，dayOffset为0到6的当地日历日偏移，两次至少相隔2天，保证至少一个完整休息日。每场title、dayOffset、exercises（每项仅exerciseID、role；role只能逐字使用warmup、main、cooldown，禁止把动作功能写成role。无负重髋铰链unloaded-hip-hinge的role必须是warmup，不能是preparation）。每天最多一次，每场动作不重复（同一个exerciseID跨角色也算重复，walk不能同时用于热身和整理），严格按warmup、main、cooldown顺序，三阶段均必须存在。warmup只可用march-in-place、walk、unloaded-hip-hinge；cooldown只可用walk、functional-cooldown-calf-stretch、functional-cooldown-hamstring-stretch，仍须符合所给候选的器材与条件。warmup必须包含march-in-place或walk作为常规升温动作；髋铰链学习只能额外加入，不能单独代替必要热身。main必须先恰好1个kneeDominant和1个hipDominant基础动作，再可选0至2个辅助动作（kneeFlexion、calf、hipAdduction、hipAbduction、kneeExtension）；同场每个辅助mainPattern最多一个动作，扶稳/无支撑提踵或坐姿/俯卧腿弯举是替代变式，不能重复占两个辅助位。辅助动作和髋铰链学习不得冒充基础覆盖；髋铰链学习只可用warmup角色。所有main的workSets合计初学者最多8、其他经验最多10，workSets已计入单侧左右实际组数。例如2+2+2+4=10，初学者不能采用这四项主练；宁可只选两项基础主练，也不要超限。候选options已由程序按器材、经验及已确认的逐项条件筛选，example展示当前条件下一份已通过校验的完整基础组合，可使用或在满足全部规则时调整。不要因为某项未通过但与候选无关的条件，排除程序已确认可用的基础替代动作。只选给出的合格动作/角色，不能创造动作、修改模板或缩短剂量。总时间为所有estimatedSeconds加每相邻动作30秒，必须不超过availableMinutes×60。超时先移除可选辅助动作，不删除基础主练或必要热身整理，不缩短模板剂量。只称为下肢基础方案，不声称完整全身；若用户目标超出候选覆盖，或无法组成上述方案，只返回{\"unavailable\":true}，不要自由文本理由。"
  : "返回 JSON：title、sessions。每次训练包含 title、dayOffset（0到6）、exercises（每项仅 exerciseID、role）。每天最多一次，每场动作不重复。严格按 warmup、main、cooldown 顺序，每类至少一个动作；只选所给合格动作与角色，不能创造动作或更改模板剂量。estimatedSeconds 合计不得超过 availableMinutes × 60。当前目录的主训练覆盖有限，不得称为完整全身或腿部计划；先检查用户目标是否能由合格主训练满足。若目标（例如腿部专项、完整全身训练或只有哑铃却没有适合主动作）不受当前候选支持，只返回 {\"unavailable\":true}，不得硬凑上肢动作，也不得返回自由文本理由。";
 return { instruction, catalogVersion: lowerBody ? catalogV2.catalogVersion : catalog.catalogVersion,
  catalogHash: lowerBody ? exerciseCatalogV2Hash : exerciseCatalogHash,
  ...(lowerBody ? {programKind:"lowerBodyBasics",rulesVersion:2,workSetLimit:workSetLimit(b),transitionSeconds:30} : {}),
  preferences: b.preferences, options:promptOptions, ...(example ? {example} : {}) };
}

export function buildCatalogPlan(raw: unknown, b: AIRequest, makeMetadata: () => Record<string, unknown>, dateAtOffset: (timestamp: number, offset: number, timeZone: string) => number) {
 const options = catalogPlanOptions(b), draft = z.union([planOutput, z.object({unavailable:z.literal(true)}).strict()]).parse(raw), prefs = b.preferences!, lowerBody=isLowerBody(b);
 if ("unavailable" in draft) throw new Failure("plan_conditions_insufficient");
 if (new Set(draft.sessions.map(s => s.dayOffset)).size !== draft.sessions.length) throw new Failure("invalid_output", 502);
 if (lowerBody && (draft.sessions.length!==2 || Math.abs(draft.sessions[0].dayOffset-draft.sessions[1].dayOffset)<2)) throw new Failure("invalid_output",502);
 const sessions = draft.sessions.map(s => {
  if (new Set(s.exercises.map(e => e.exerciseID)).size !== s.exercises.length) throw new Failure("invalid_output", 502);
  const phaseIndices = s.exercises.map(e => roles.indexOf(e.role));
  if (!roles.every(r => s.exercises.some(e => e.role === r)) || phaseIndices.some((p, i) => i > 0 && p < phaseIndices[i - 1])) throw new Failure("invalid_output", 502);
  const selected = s.exercises.map(e=>{
   const option=options.find(x=>x.exerciseID===e.exerciseID && x.role===e.role);
   if(!option) throw new Failure("invalid_output",502);
   return option;
  });
  if(lowerBody && (!lowerBodyMainsValid(selected,b) || !selected.some(x=>x.role==="warmup" && x.trainingSlot!=="preparation"))) throw new Failure("invalid_output",502);
  // A valid optional auxiliary is the only removable part of a proposed session.
  // Keep every chosen warmup/cooldown and the base pair at their audited doses.
  if(lowerBody) {
   while(sessionSeconds(selected,true)>prefs.availableMinutes*60) {
    const index=selected.findLastIndex(x=>x.role==="main" && auxiliarySlots.includes(x.trainingSlot ?? ""));
    if(index<0) break;
    selected.splice(index,1);
   }
  }
  const minutes = Math.max(10, Math.ceil(sessionSeconds(selected,lowerBody) / 60));
  if (minutes > prefs.availableMinutes) throw new Failure("invalid_output", 502);
  const exercises = selected.map(option=>({id:crypto.randomUUID(),name:option.name,prescription:option.prescription,catalogID:option.exerciseID,catalogVersion:lowerBody?catalogV2.catalogVersion:catalog.catalogVersion,templateID:option.templateID,role:option.role}));
  return { metadata: makeMetadata(), title: s.title, scheduledAt: dateAtOffset(b.today, s.dayOffset, b.timeZoneID), minutes, exercises };
 });
 return { metadata: makeMetadata(), title: draft.title, status: "draft", sessions,
  generationContext: { experience: prefs.experience, availableEquipmentIDs: [...prefs.availableEquipmentIDs!], availableMinutes: prefs.availableMinutes,
   ...(lowerBody ? {movementConditions:(prefs.movementConditions??[]).map(x=>({...x})),programKind:"lowerBodyBasics",rulesVersion:2} : {}) } };
}
