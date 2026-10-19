import { z } from "zod";
import { workoutSchemas } from "./workout.ts";
import { Failure } from "./http.ts";
import { exerciseCatalog } from "./generated/exercise-catalog.ts";
import { exerciseCatalog as exerciseCatalogV2 } from "./generated/exercise-catalog-v2.ts";
export const uuid = z.uuid();
export const consent = z.object({deviceID:uuid, revision:z.number().int().positive(), healthRead:z.boolean(),cloudSync:z.boolean(),aiProcessing:z.boolean(),policyVersion:z.literal("2026-09-23")}).strict();
export const metadata = z.object({id:uuid,createdAt:z.number().finite(),updatedAt:z.number().finite(),source:z.enum(["healthKit","manual","generated"]),schemaVersion:z.literal(1),revision:z.number().int().positive().optional()}).strict();
export const summary = z.object({metadata,dayKey:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),timeZoneID:z.string().min(1).max(100),date:z.number().finite(),weightKG:z.number().positive().max(1000).nullish(),sleepMinutes:z.number().int().min(0).max(1440).nullish(),steps:z.number().int().min(0).max(200000).nullish(),activeMinutes:z.number().int().min(0).max(1440).nullish(),metricSources:z.record(z.string(),z.array(z.string().max(200))).optional(),calculationVersion:z.number().int().positive().optional()}).strict();
export const evidence = z.object({id:uuid,summaryID:uuid,dayKey:z.string(),metric:z.string(),value:z.string(),source:z.enum(["healthKit","manual","generated"]),summaryVersion:z.number().int().positive().optional()}).strict();
export const message = z.object({metadata,role:z.enum(["user","coach"]),content:z.string().max(16000),evidence:z.array(evidence).max(150),status:z.enum(["generating","complete","cancelled","failed"])}).strict();
export const movementCondition = z.object({conditionID:z.string().min(1).max(120),version:z.number().int().positive(),status:z.enum(["ready","unsure","unable"])}).strict();
export const movementConditions = z.array(movementCondition).max(50).nullish();
export const preferences = z.object({metadata,goal:z.string().trim().min(1).max(200),experience:z.enum(["初学者","偶尔运动","规律运动"]),equipment:z.enum(["自重","哑铃","健身房"]),availableMinutes:z.number().int().min(10).max(90),availableEquipmentIDs:z.array(z.string().min(1).max(100)).max(50).nullish(),movementConditions,limitations:z.string().max(1000),healthRead:z.boolean(),cloudSync:z.boolean(),aiProcessing:z.boolean(),onboardingComplete:z.boolean()}).strict();
export const report = z.object({metadata,summaryID:uuid,sections:z.array(z.object({id:uuid,title:z.string(),body:z.string().max(8000),evidence:z.array(evidence).max(150)}).strict()).length(4)}).strict();
export const exercise = z.object({id:uuid,name:z.string().min(1).max(100),prescription:z.string().min(1).max(1000),
 catalogID:z.string().min(1).max(120).nullish(),catalogVersion:z.number().int().positive().nullish(),
 templateID:z.string().min(1).max(160).nullish(),role:z.enum(["warmup","main","cooldown"]).nullish()}).strict();
export const generationContext = z.object({experience:z.enum(["初学者","偶尔运动","规律运动"]),availableEquipmentIDs:z.array(z.string().min(1).max(100)).max(50),availableMinutes:z.number().int().min(10).max(90),movementConditions,programKind:z.string().min(1).max(100).nullish(),rulesVersion:z.number().int().positive().nullish()}).strict();
export const session = z.object({metadata,title:z.string().min(1).max(200),scheduledAt:z.number().finite(),minutes:z.number().int().min(10).max(90),exercises:z.array(exercise).min(1).max(20),feedback:z.object({completed:z.boolean(),perceivedEffort:z.number().int().min(1).max(10),note:z.string().max(4000),recordedAt:z.number().finite()}).strict().nullish()}).strict();
export const plan = z.object({metadata,title:z.string().min(1).max(200),status:z.enum(["draft","confirmed"]),sessions:z.array(session).max(7),generationContext:generationContext.nullish()}).strict();
export const kind = z.enum(["profiles","summaries","reports","conversations","messages","plans","sessions","notes","workoutTemplates","workoutLogs"]);
export const record = z.object({id:uuid,kind,logicalID:z.string().min(1).max(200),parentID:uuid.nullish(),payload:z.string().max(262144),version:z.number().int().nonnegative(),deleted:z.boolean()}).strict();
export const aiRequest = z.object({requestID:uuid,schemaVersion:z.literal(1),consent,summary:summary.optional(),history:z.array(summary).max(30).default([]),question:z.string().trim().min(1).max(2000).optional(),messages:z.array(message).max(12).default([]),preferences:preferences.optional(),planCatalogVersion:z.union([z.literal(1),z.literal(2)]).optional(),programKind:z.literal("lowerBodyBasics").optional(),today:z.number().finite(),timeZoneID:z.string().max(100)}).strict().superRefine((value,ctx)=>{
 if((value.planCatalogVersion===2)!==(value.programKind==="lowerBodyBasics")) ctx.addIssue({code:"custom",message:"catalog version and program kind must match"});
});
export type Summary = z.infer<typeof summary>;
export function validatePayload(r:z.infer<typeof record>) {
 const p = JSON.parse(r.payload);
 if(r.deleted) { if(JSON.stringify(p)!=="{}") throw new Failure("invalid_input"); return; }
 const schemas = {...workoutSchemas(metadata),profiles:preferences,summaries:summary,reports:report,conversations:z.object({metadata,title:z.string().max(200),messages:z.array(message).length(0)}).strict(),messages:message,plans:plan.extend({sessions:z.array(session).length(0)}),sessions:session,notes:z.object({dayKey:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),text:z.string().max(10000)}).strict()};
 schemas[r.kind].parse(p);
 if(r.kind==="workoutTemplates" || r.kind==="workoutLogs") {
  if(r.parentID != null || r.logicalID.toLowerCase() !== r.id.toLowerCase()) throw new Failure("invalid_input");
 }
 if(r.kind==="sessions") {
  if(new Set(p.exercises.map((x:{id:string})=>x.id.toLowerCase())).size!==p.exercises.length) throw new Failure("invalid_input");
  for(const item of p.exercises) {
   if(item.catalogID == null) continue; // Missing is a legacy write; null explicitly unlinks.
   const supportedCatalog = item.catalogVersion===1 ? exerciseCatalog : item.catalogVersion===2 ? exerciseCatalogV2 : undefined;
   const entries: readonly {id:string;name:string;templates:readonly {id:string;role:string;prescription:string}[]}[] = supportedCatalog?.exercises ?? [];
   const linked = entries.find(x=>x.id===item.catalogID);
   // Sync is a historical-record transport, not a new-plan selection boundary.
   // Preserve opaque future/retired references so date and feedback edits still sync.
   if(!linked) continue;
   if(linked.name!==item.name) throw new Failure("invalid_input");
   const template = linked.templates.find(t=>t.id===item.templateID);
   if(template && (template.role!==item.role || template.prescription!==item.prescription)) throw new Failure("invalid_input");
  }
 }
 if(p.metadata && p.metadata.id.toLowerCase()!==r.id.toLowerCase()) throw new Failure("invalid_input");
 if(r.kind==="summaries" && r.logicalID!==`${p.dayKey}|${p.timeZoneID}`) throw new Failure("invalid_input");
 if(r.kind==="notes" && r.logicalID!==p.dayKey) throw new Failure("invalid_input");
 if(r.kind==="profiles" && r.logicalID!=="profile") throw new Failure("invalid_input");
}
