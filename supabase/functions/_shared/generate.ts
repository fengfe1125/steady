import { aiRequest } from "./schema.ts";
import { handler,identity,input,json,Failure } from "./http.ts";
import { buildPlan,buildReport,finish,modelRequest,validateRequest } from "./coach.ts";
export function generate(route:"report"|"plan-draft") {
 return handler(async req=>{
  const who=await identity(req),b=aiRequest.parse(await input(req)); validateRequest(b,route);
  await who.rpc("begin_ai",{rid:b.requestID,request_kind:route,c:b.consent});
  try {
   const {response,refs}=await modelRequest(route,b,AbortSignal.any([req.signal,AbortSignal.timeout(90000)]));
   const data=await response.json();
   if(data.choices?.[0]?.finish_reason!=="stop") throw new Failure("invalid_output",502);
   const raw=JSON.parse(data.choices[0].message.content);
   const result=route==="report"?buildReport(raw,b,refs):buildPlan(raw,b);
   // Re-check the latest consent after the model call, before returning content.
   await who.rpc("set_consents",{c:b.consent});
   await finish(who,b,true,data.usage);
   return json(result);
  } catch(error) { await finish(who,b,false).catch(()=>{}); throw error; }
 });
}
