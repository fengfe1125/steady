import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
export class Failure extends Error {
 constructor(public code:string,public status=400) { super(code); }
}
export function json(body:unknown,status=200) { return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}}); }
export async function input(req:Request):Promise<unknown> {
 if(req.method!=="POST") throw new Failure("method_not_allowed",405);
 if(!req.headers.get("content-type")?.includes("application/json")) throw new Failure("invalid_input");
 const reader=req.body?.getReader(); if(!reader) throw new Failure("invalid_input");
 let length=0; const chunks:Uint8Array[]=[];
 while(true) { const {value,done}=await reader.read(); if(done) break; length+=value.length; if(length>512*1024) { await reader.cancel(); throw new Failure("payload_too_large",413); } chunks.push(value); }
 const all=new Uint8Array(length); let offset=0; for(const chunk of chunks) { all.set(chunk,offset); offset+=chunk.length; }
 try { return JSON.parse(new TextDecoder().decode(all)); } catch { throw new Failure("invalid_input"); }
}
export async function identity(req:Request) {
 const token=req.headers.get("authorization")?.replace(/^Bearer /i,"");
 if(!token || token.split(".").length!==3) throw new Failure("unauthenticated",401);
 const url=Deno.env.get("SUPABASE_URL")!, secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.auth.getUser(token);
 if(error || !data.user) throw new Failure("unauthenticated",401);
 let sid:string;
 try { const encoded=token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"); sid=z.uuid().parse(JSON.parse(atob(encoded)).session_id); }
 catch { throw new Failure("unauthenticated",401); }
 const uid=data.user.id;
 async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T> {
  const {data,error}=await admin.rpc(name,{uid,sid,...args});
  if(error) {
   const known=["unauthenticated","consent_required","account_deleting","rate_limited","duplicate_request","request_in_progress"];
   const code=known.find(c=>error.message.includes(c))??"invalid_input";
   throw new Failure(code,code==="unauthenticated"?401:code==="rate_limited"?429:code==="invalid_input"?400:409);
  }
  return data as T;
 }
 return {uid,sid,user:data.user,admin,rpc};
}
export type Identity=Awaited<ReturnType<typeof identity>>;
export function handler(work:(req:Request)=>Promise<Response>) {
 return async(req:Request)=>{
  try { return await work(req); }
  catch(error) {
   if(error instanceof Failure) return json({code:error.code},error.status);
   if(error instanceof z.ZodError || error instanceof SyntaxError) return json({code:"invalid_input"},400);
   // Never log thrown SDK/provider messages; they may contain request bodies.
   return json({code:"provider_unavailable"},503);
  }
 };
}
