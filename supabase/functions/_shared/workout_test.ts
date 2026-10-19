import { validatePayload, record } from "./schema.ts";
import { filterPullPage } from "./workout.ts";
function check(value:unknown,message="assertion failed") { if(!value) throw new Error(message); }
const id="11111111-1111-4111-8111-111111111111";
const metadata={id,createdAt:1,updatedAt:1,source:"manual",schemaVersion:1};
const move={id,identity:"custom:test",name:"测试",metric:"weightReps",perSide:false,loadBasis:"total",target:{sets:1,minReps:8,maxReps:12,durationSeconds:60,restSeconds:90,incrementKG:2.5}};
const set={id,side:"both",warmup:false,weightKG:10,reps:12,completedAt:100};
const log={metadata,title:"训练",startedAt:1,endedAt:100,status:"completed",elapsedSeconds:99,note:"",exercises:[{id,move,sets:[set]}]};
function validate(payload:unknown,kind="workoutLogs",extra={}) { validatePayload(record.parse({id,kind,logicalID:id,payload:JSON.stringify(payload),version:0,deleted:false,...extra})); }
function rejects(payload:unknown,kind="workoutLogs",extra={}) { let rejected=false;try{validate(payload,kind,extra);}catch{rejected=true;}check(rejected,"invalid record accepted"); }
Deno.test("workout template and actual completed log validate",()=>{
 validate({metadata,title:"模板",moves:[move]},"workoutTemplates");validate(log);
 validate({...log,status:"active",endedAt:null,runningSince:10,exercises:[{id,move,sets:[{id,side:"both",warmup:false}]}]});
});
Deno.test("reject missing actuals, duplicate sets, invalid state, side and identity",()=>{
 rejects({...log,exercises:[{id,move,sets:[{...set,weightKG:null}]}]});
 rejects({...log,exercises:[{id,move,sets:[set,set]}]});
 rejects({...log,exercises:[{id,move,sets:[{...set,side:"left"}]}]});
 rejects({...log,status:"paused"});rejects({...log,runningSince:10});
 rejects({...log,exercises:[{id,move,sets:[]}]});
 rejects({...log,exercises:[{id,move:{...move,perSide:true},sets:[{...set,side:"left"}]}]});
 rejects(log,"workoutLogs",{parentID:id});rejects(log,"workoutLogs",{logicalID:"wrong"});
 rejects({...log,metadata:{...metadata,id:"22222222-2222-4222-8222-222222222222"}});
});
Deno.test("legacy clients never receive new kinds and cursors keep advancing",()=>{
 const page={records:[{kind:"workoutLogs"},{kind:"sessions"},{kind:"futureKind"}],cursor:10,hasMore:true};
 const legacy=filterPullPage(page);check(legacy.records.length===1&&legacy.records[0].kind==="sessions");check(legacy.cursor===10&&legacy.hasMore);
 const current=filterPullPage(page,["sessions","workoutLogs"]);check(current.records.length===2);
 const empty=filterPullPage({...page,records:[{kind:"workoutLogs"}]});check(empty.records.length===0&&empty.cursor===10);
});
