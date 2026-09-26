import { z } from "zod";
import { handler,identity,input,json } from "../_shared/http.ts";
import { consent,record,uuid,validatePayload } from "../_shared/schema.ts";
const body=z.object({consent,mutation:z.object({id:uuid,record,attempt:z.number().int().nonnegative(),retryAt:z.number()}).strict()}).strict();
Deno.serve(handler(async req=>{
 const who=await identity(req),b=body.parse(await input(req));
 validatePayload(b.mutation.record);
 return json(await who.rpc("sync_push",{m:b.mutation,c:b.consent}));
}));
