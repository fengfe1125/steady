import { handler,identity,input,json } from "../_shared/http.ts";
import { consent } from "../_shared/schema.ts";
Deno.serve(handler(async req=>{
 const who=await identity(req),c=consent.parse(await input(req));
 return json(await who.rpc("set_consents",{c}));
}));
