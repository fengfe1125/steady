import { z } from "zod";
import { handler,identity,input,json } from "../_shared/http.ts";
import { consent } from "../_shared/schema.ts";
const body=z.object({consent,cursor:z.number().int().nonnegative()}).strict();
Deno.serve(handler(async req=>{
 const who=await identity(req),b=body.parse(await input(req));
 return json(await who.rpc("sync_pull",{cursor_value:b.cursor,c:b.consent}));
}));
