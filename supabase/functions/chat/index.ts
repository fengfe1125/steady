import { aiRequest } from "../_shared/schema.ts";
import { handler,identity,input,Failure } from "../_shared/http.ts";
import { finish,modelRequest,validateRequest } from "../_shared/coach.ts";
Deno.serve(handler(async req=>{
 const who=await identity(req),b=aiRequest.parse(await input(req));validateRequest(b,"chat");
 await who.rpc("begin_ai",{rid:b.requestID,request_kind:"chat",c:b.consent});
 const controller=new AbortController();
 const signal=AbortSignal.any([req.signal,controller.signal,AbortSignal.timeout(90000)]);
 let provider:Awaited<ReturnType<typeof modelRequest>>;
 try { provider=await modelRequest("chat",b,signal); }
 catch(error) { await finish(who,b,false).catch(()=>{});throw error; }
 const encoder=new TextEncoder();
 const stream=new ReadableStream<Uint8Array>({
  async start(output) {
   const emit=(event:string,data:unknown)=>output.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
   let usage: {prompt_tokens?:number;completion_tokens?:number}|undefined;
   try {
    emit("evidence",provider.refs);
    const reader=provider.response.body!.getReader(),decoder=new TextDecoder();let buffer="",done=false,total=0;
    while(!done) {
     const chunk=await reader.read(); if(chunk.done) break;
     buffer+=decoder.decode(chunk.value,{stream:true});
     const lines=buffer.split("\n");buffer=lines.pop()!;
     for(const line of lines) {
      if(!line.startsWith("data:"))continue;
      const data=line.slice(5).trim();
      if(data==="[DONE]") { done=true;break; }
      if(!data)continue;
      const value=JSON.parse(data);
      if(value.usage) usage=value.usage;
      const text=value.choices?.[0]?.delta?.content;
      if(typeof text==="string"&&text) { total+=text.length;if(total>12000)throw new Failure("invalid_output",502);emit("delta",{text}); }
      if(value.choices?.[0]?.finish_reason&&value.choices[0].finish_reason!=="stop")throw new Failure("invalid_output",502);
     }
    }
    await reader.cancel();
    if(!done||!total) throw new Failure("provider_unavailable",503);
    await who.rpc("set_consents",{c:b.consent});
    await finish(who,b,true,usage);emit("complete",{});output.close();
   } catch {
    controller.abort();await finish(who,b,false,usage).catch(()=>{});
    try {emit("error",{code:"interrupted"});output.close();}catch{ /* client already disconnected */ }
   }
  },
  cancel() { controller.abort(); }
 });
 return new Response(stream,{headers:{"content-type":"text/event-stream","cache-control":"no-store","x-accel-buffering":"no"}});
}));
