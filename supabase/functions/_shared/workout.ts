import { z } from "zod";
const id = z.uuid();
const finite = z.number().finite();
const target = z.object({sets:z.number().int().min(1).max(20),minReps:z.number().int().min(1).max(1000),maxReps:z.number().int().min(1).max(1000),durationSeconds:z.number().int().min(1).max(86400),restSeconds:z.number().int().min(0).max(900),weightKG:finite.min(0).max(1000).nullish(),incrementKG:finite.positive().max(100).nullish()}).strict().refine(t=>t.minReps<=t.maxReps);
const teaching = z.object({kind:z.string(),topic:z.string().nullish(),lessonID:z.string()}).strict();
const move = z.object({id,identity:z.string().min(1).max(200),name:z.string().trim().min(1).max(100),catalogID:z.string().nullish(),catalogVersion:z.number().int().positive().nullish(),teaching:teaching.nullish(),metric:z.enum(["weightReps","reps","duration"]),perSide:z.boolean(),loadBasis:z.enum(["total","perSide"]),target,prescription:z.string().max(1000).nullish()}).strict();
const set = z.object({id,side:z.enum(["both","left","right"]),warmup:z.boolean(),weightKG:finite.min(0).max(1000).nullish(),reps:z.number().int().min(1).max(1000).nullish(),durationSeconds:z.number().int().min(1).max(86400).nullish(),completedAt:finite.nullish()}).strict();
function unique(values:{id:string}[]) { return new Set(values.map(x=>x.id.toLowerCase())).size===values.length; }
export function workoutSchemas(metadata:z.ZodType) {
 const template = z.object({metadata,title:z.string().trim().min(1).max(200),moves:z.array(move).min(1).max(40)}).strict().refine(t=>unique(t.moves));
 const exerciseLog = z.object({id,move,sets:z.array(set).max(100)}).strict().superRefine((e,ctx)=>{
  if(!unique(e.sets)) ctx.addIssue({code:"custom",message:"duplicate sets"});
  for(const s of e.sets) {
   if(e.move.perSide ? s.side==="both" : s.side!=="both") ctx.addIssue({code:"custom",message:"invalid side"});
   if(s.completedAt!=null && ((e.move.metric==="duration" ? s.durationSeconds==null : s.reps==null) || (e.move.metric==="weightReps" && s.weightKG==null))) ctx.addIssue({code:"custom",message:"missing actual data"});
  }
 });
 const log = z.object({metadata,title:z.string().trim().min(1).max(200),templateID:id.nullish(),planID:id.nullish(),sessionID:id.nullish(),startedAt:finite,endedAt:finite.nullish(),status:z.enum(["active","paused","completed","partial"]),runningSince:finite.nullish(),elapsedSeconds:finite.min(0),restUntil:finite.nullish(),effort:z.number().int().min(1).max(10).nullish(),note:z.string().max(4000),exercises:z.array(exerciseLog).min(1).max(40)}).strict().superRefine((v,ctx)=>{
  const ongoing = v.status==="active"||v.status==="paused";
  if(!unique(v.exercises)||!unique(v.exercises.map(e=>e.move)) || ongoing !== (v.endedAt==null) || (v.status==="active")!==(v.runningSince!=null) || (v.endedAt!=null && v.endedAt<v.startedAt)) ctx.addIssue({code:"custom",message:"invalid state"});
  if(v.status==="completed") for(const e of v.exercises) {
   const work=e.sets.filter(s=>!s.warmup);
   if(work.length<e.move.target.sets*(e.move.perSide?2:1)||work.some(s=>s.completedAt==null)|| (e.move.perSide && ["left","right"].some(side=>work.filter(s=>s.side===side).length<e.move.target.sets))) ctx.addIssue({code:"custom",message:"incomplete work"});
  }
 });
 return {workoutTemplates:template,workoutLogs:log};
}
export const legacyRecordKinds = ["profiles","summaries","reports","conversations","messages","plans","sessions","notes"];
// Advance the original cursor even when a page contains only unsupported records.
export function filterPullPage(page:{records:{kind:string}[];cursor:number;hasMore:boolean},supportedKinds?:string[]) {
 const supported=new Set(supportedKinds ?? legacyRecordKinds);
 return {...page,records:page.records.filter(r=>supported.has(r.kind))};
}
