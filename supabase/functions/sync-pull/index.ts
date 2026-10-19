import { z } from "zod";
import { handler,identity,input,json } from "../_shared/http.ts";
import { filterPullPage } from "../_shared/workout.ts";
import { consent, kind } from "../_shared/schema.ts";
const body=z.object({consent,cursor:z.number().int().nonnegative(),supportedKinds:z.array(z.string().min(1).max(100)).max(50).optional()}).strict();
Deno.serve(handler(async req=>{
 const who=await identity(req),b=body.parse(await input(req));
 const page = await who.rpc("sync_pull",{cursor_value:b.cursor,c:b.consent});
 const requested = b.supportedKinds ?? req.headers.get("x-steady-record-kinds")?.split(",");
 const supported = requested ? z.array(kind).max(50).parse(requested) : undefined;
 return json({...filterPullPage(page as {records:{kind:string}[];cursor:number;hasMore:boolean},supported), supportedKinds:kind.options});
}));
