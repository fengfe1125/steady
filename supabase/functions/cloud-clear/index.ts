import { z } from "zod";
import { handler,identity,input,json } from "../_shared/http.ts";
Deno.serve(handler(async req=>{ const who=await identity(req); z.object({confirmation:z.literal("delete-cloud-records")}).strict().parse(await input(req)); return json(await who.rpc("clear_cloud")); }));
