import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createRemoteJWKSet,jwtVerify,SignJWT,importPKCS8,CompactEncrypt,compactDecrypt } from "jose";
import { handler,identity,input,json,Failure } from "../_shared/http.ts";
const body=z.object({idToken:z.string().max(16000),authorizationCode:z.string().max(4000),nonce:z.string().min(32).max(256)}).strict();
const appleKeys=createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
Deno.serve(handler(async req=>{
 const who=await identity(req),raw=await input(req);
 if(typeof raw==="object" && raw!==null && "emailCode" in raw) {
  const b=z.object({emailCode:z.string().regex(/^\d{6,10}$/)}).strict().parse(raw);
  // Apple-linked identities must use the revocation flow; email cannot bypass it.
  if(!who.user.email || who.user.identities?.some(i=>i.provider==="apple"))throw new Failure("unauthenticated",401);
  const verifier=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
  const verified=await verifier.auth.verifyOtp({email:who.user.email,token:b.emailCode,type:"email"});
  if(verified.error || verified.data.user?.id!==who.uid)throw new Failure("unauthenticated",401);
  const job=await who.admin.rpc("deletion_job",{uid:who.uid,token_cipher:null,mark_revoked:true});
  if(job.error)throw new Failure("deletion_pending",503);
  // Deleting auth.users cascades all sessions and business rows atomically.
  const deleted=await who.admin.auth.admin.deleteUser(who.uid);
  if(deleted.error)throw new Failure("deletion_pending",503);
  return json({deleted:true});
 }
 const b=body.parse(raw);
 const clientID=Deno.env.get("APPLE_CLIENT_ID")!,teamID=Deno.env.get("APPLE_TEAM_ID")!,keyID=Deno.env.get("APPLE_KEY_ID")!,privateKey=Deno.env.get("APPLE_PRIVATE_KEY"),encryptionKey=Deno.env.get("DELETION_ENCRYPTION_KEY");
 if(!clientID||!teamID||!keyID||!privateKey||!encryptionKey)throw new Failure("deletion_not_configured",503);
 const {payload}=await jwtVerify(b.idToken,appleKeys,{issuer:"https://appleid.apple.com",audience:clientID,maxTokenAge:"5m"});
 const nonce=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(b.nonce)))).map(n=>n.toString(16).padStart(2,"0")).join("");
 if(payload.nonce!==nonce||!who.user.identities?.some(i=>i.provider==="apple"&&(i.identity_data?.sub===payload.sub||i.id===payload.sub)))throw new Failure("unauthenticated",401);
 const key=Uint8Array.from(atob(encryptionKey),c=>c.charCodeAt(0));if(key.length!==32)throw new Failure("deletion_not_configured",503);
 const secret=await new SignJWT({}).setProtectedHeader({alg:"ES256",kid:keyID}).setIssuer(teamID).setAudience("https://appleid.apple.com").setSubject(clientID).setIssuedAt().setExpirationTime("5m").sign(await importPKCS8(privateKey,"ES256"));
 const job=async(token_cipher:string|null=null,mark_revoked=false)=>{
  const {data,error}=await who.admin.rpc("deletion_job",{uid:who.uid,token_cipher,mark_revoked});
  if(error)throw new Failure("deletion_pending",503);return data as {encryptedToken?:string;appleRevoked:boolean};
 };
 let state=await job();
 if(!state.appleRevoked) {
  let refresh:string;
  if(state.encryptedToken)refresh=new TextDecoder().decode((await compactDecrypt(state.encryptedToken,key)).plaintext);
  else {
   const response=await fetch("https://appleid.apple.com/auth/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientID,client_secret:secret,code:b.authorizationCode,grant_type:"authorization_code"}),signal:AbortSignal.timeout(15000)});
   const data=await response.json();if(!response.ok||typeof data.refresh_token!=="string")throw new Failure("deletion_pending",503);
   refresh=data.refresh_token;
   const cipher=await new CompactEncrypt(new TextEncoder().encode(refresh)).setProtectedHeader({alg:"dir",enc:"A256GCM"}).encrypt(key);
   state=await job(cipher);
  }
  const revoked=await fetch("https://appleid.apple.com/auth/revoke",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientID,client_secret:secret,token:refresh,token_type_hint:"refresh_token"}),signal:AbortSignal.timeout(15000)});
  if(!revoked.ok)throw new Failure("deletion_pending",503);
  await job(null,true);
 }
 const token=req.headers.get("authorization")!.replace(/^Bearer /i,"");
 const signedOut=await who.admin.auth.admin.signOut(token,"global");
 if(signedOut.error)throw new Failure("deletion_pending",503);
 const deleted=await who.admin.auth.admin.deleteUser(who.uid);
 if(deleted.error)throw new Failure("deletion_pending",503);
 return json({deleted:true});
}));
