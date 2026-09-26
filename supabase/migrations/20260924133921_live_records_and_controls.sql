-- Live records use typed JSON envelopes. Only checked RPCs may write server-owned fields.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.records (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null,
 kind text not null check (kind in ('profiles','summaries','reports','conversations','messages','plans','sessions','notes')),
 logical_id text not null check (length(logical_id) between 1 and 200),
 parent_id uuid,
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 262144),
 version bigint not null default 1 check (version > 0),
 deleted boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key (user_id,id),
 foreign key(user_id,parent_id) references public.records(user_id,id) deferrable initially deferred,
 check ((kind in ('messages','sessions')) = (parent_id is not null))
);
create unique index records_live_logical on public.records(user_id,kind,logical_id) where not deleted;
create index records_parent on public.records(user_id,parent_id);
alter table public.records enable row level security;
revoke all on public.records from anon, authenticated;
grant select on public.records to authenticated;

create table private.account_state(user_id uuid primary key references auth.users(id) on delete cascade, deleting boolean not null default false, head bigint not null default 0);
create table private.changes(user_id uuid not null references auth.users(id) on delete cascade, seq bigint not null, record_id uuid not null, primary key(user_id,seq), foreign key(user_id,record_id) references public.records(user_id,id) on delete cascade);
create index changes_record on private.changes(user_id,record_id);
create table private.mutations(user_id uuid not null references auth.users(id) on delete cascade, mutation_id uuid not null, result jsonb not null, primary key(user_id,mutation_id));
create table private.device_consents(user_id uuid not null references auth.users(id) on delete cascade, device_id uuid not null, revision bigint not null, health_read boolean not null, cloud_sync boolean not null, ai_processing boolean not null, policy_version text not null, primary key(user_id,device_id));
create table public.consent_events(id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,device_id uuid not null,revision bigint not null,purpose text not null check(purpose in ('health_read','cloud_sync','ai_processing')),granted boolean not null,policy_version text not null,recorded_at timestamptz not null default now());
create index consent_events_owner on public.consent_events(user_id,recorded_at);
alter table public.consent_events enable row level security;
revoke all on public.consent_events from anon,authenticated;
grant select on public.consent_events to authenticated;
create table private.ai_requests(user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,kind text not null check(kind in ('report','chat','plan-draft')),state text not null check(state in ('running','complete','failed')),started_at timestamptz not null default now(),finished_at timestamptz,model text,input_tokens bigint,output_tokens bigint,primary key(user_id,request_id));
create index ai_requests_usage on private.ai_requests(user_id,started_at,kind);
create table private.deletion_jobs(user_id uuid primary key references auth.users(id) on delete cascade,encrypted_token text,apple_revoked boolean not null default false);
-- Defense in depth; no client has table grants in this schema.
alter table private.account_state enable row level security;
alter table private.changes enable row level security;
alter table private.mutations enable row level security;
alter table private.device_consents enable row level security;
alter table private.ai_requests enable row level security;
alter table private.deletion_jobs enable row level security;
revoke all on all tables in schema private from public,anon,authenticated;

-- Deliberately privileged: restricted to identity validation/controlled writes, never arbitrary SQL.
create function private.require_user(allow_deleting boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); sid uuid := (auth.jwt()->>'session_id')::uuid;
begin
 if uid is null or sid is null or not exists(select 1 from auth.sessions where id=sid and user_id=uid) then raise exception 'unauthenticated' using errcode='28000'; end if;
 if not allow_deleting and exists(select 1 from private.account_state where user_id=uid and deleting) then raise exception 'account_deleting'; end if;
 return uid;
end $$;
revoke all on function private.require_user(boolean) from public,anon;
grant execute on function private.require_user(boolean) to authenticated;
create policy own_records on public.records for select to authenticated using(user_id=(select private.require_user()));
create policy own_consents on public.consent_events for select to authenticated using(user_id=(select private.require_user()));

create function private.lock_user(uid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if uid is distinct from private.require_user() then raise exception 'unauthenticated'; end if;
 insert into private.account_state(user_id) values(uid) on conflict do nothing;
 perform 1 from private.account_state where user_id=uid for update;
end $$;

create function private.check_consent(c jsonb,purpose text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_user(); ok boolean;
begin
 select case purpose when 'cloud_sync' then cloud_sync when 'ai_processing' then ai_processing else false end into ok
 from private.device_consents where user_id=uid and device_id=(c->>'deviceID')::uuid and revision=(c->>'revision')::bigint and policy_version='2026-09-23';
 if ok is distinct from true then raise exception 'consent_required'; end if;
end $$;
create function private.set_consents(c jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_user(); previous private.device_consents; device uuid := (c->>'deviceID')::uuid; revision bigint := (c->>'revision')::bigint;
begin
 perform private.lock_user(uid);
 if c->>'policyVersion' <> '2026-09-23' or revision < 1 or not(c ?& array['healthRead','cloudSync','aiProcessing']) then raise exception 'invalid_input'; end if;
 select * into previous from private.device_consents where user_id=uid and device_id=device;
 if found and previous.revision > revision then raise exception 'consent_required'; end if;
 if found and previous.revision=revision then
  if previous.health_read<>(c->>'healthRead')::boolean or previous.cloud_sync<>(c->>'cloudSync')::boolean or previous.ai_processing<>(c->>'aiProcessing')::boolean then raise exception 'consent_required'; end if;
  return jsonb_build_object('accepted',true);
 end if;
 insert into private.device_consents values(uid,device,revision,(c->>'healthRead')::boolean,(c->>'cloudSync')::boolean,(c->>'aiProcessing')::boolean,c->>'policyVersion')
 on conflict(user_id,device_id) do update set revision=excluded.revision,health_read=excluded.health_read,cloud_sync=excluded.cloud_sync,ai_processing=excluded.ai_processing,policy_version=excluded.policy_version;
 insert into public.consent_events(user_id,device_id,revision,purpose,granted,policy_version)
 select uid,device,revision,x.purpose,x.granted,'2026-09-23' from (values('health_read',(c->>'healthRead')::boolean),('cloud_sync',(c->>'cloudSync')::boolean),('ai_processing',(c->>'aiProcessing')::boolean)) x(purpose,granted);
 return jsonb_build_object('accepted',true);
end $$;

create function private.envelope(r public.records) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',r.id,'kind',r.kind,'logicalID',r.logical_id,'parentID',r.parent_id,'payload',r.payload::text,'version',r.version,'deleted',r.deleted)
$$;
create function private.sync_push(m jsonb,c jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_user(); record jsonb := m->'record'; mid uuid := (m->>'id')::uuid; rid uuid := (record->>'id')::uuid; existing public.records; child public.records; result jsonb; payload jsonb; seq bigint;
begin
 perform private.lock_user(uid); perform private.check_consent(c,'cloud_sync');
 select x.result into result from private.mutations x where user_id=uid and mutation_id=mid;
 if found then return result; end if;
 select * into existing from public.records where user_id=uid and (id=rid or (not deleted and kind=record->>'kind' and logical_id=record->>'logicalID')) order by (id=rid) desc limit 1;
 if found and (existing.version<>(record->>'version')::bigint or existing.id<>rid or existing.deleted) then
  result:=jsonb_build_object('record',private.envelope(existing),'conflict',true);
 else
  if existing.id is null and (record->>'version')::bigint<>0 then raise exception 'invalid_version'; end if;
  if existing.id is not null and (existing.kind<>record->>'kind' or existing.logical_id<>record->>'logicalID' or existing.parent_id is distinct from (record->>'parentID')::uuid) then raise exception 'invalid_identity'; end if;
  payload := case when (record->>'deleted')::boolean then '{}'::jsonb else (record->>'payload')::jsonb end;
  if record->>'kind' in ('messages','sessions') and not exists(select 1 from public.records where user_id=uid and id=(record->>'parentID')::uuid and not deleted and kind=case record->>'kind' when 'messages' then 'conversations' else 'plans' end) then raise exception 'invalid_parent'; end if;
  if payload->'metadata'->>'source'='demo' then raise exception 'demo_data_forbidden'; end if;
  insert into public.records(user_id,id,kind,logical_id,parent_id,payload,version,deleted) values(uid,rid,record->>'kind',record->>'logicalID',(record->>'parentID')::uuid,payload,coalesce(existing.version,0)+1,(record->>'deleted')::boolean)
  on conflict(user_id,id) do update set payload=excluded.payload,version=excluded.version,deleted=excluded.deleted,updated_at=now() returning * into existing;
  update private.account_state set head=head+1 where user_id=uid returning head into seq;
  insert into private.changes values(uid,seq,rid);
  if existing.deleted then
   for child in update public.records set payload='{}',deleted=true,version=version+1,updated_at=now() where user_id=uid and parent_id=rid and not deleted returning * loop
    update private.account_state set head=head+1 where user_id=uid returning head into seq;
    insert into private.changes values(uid,seq,child.id);
    update private.mutations cached set result=jsonb_build_object('record',private.envelope(child),'conflict',true) where cached.user_id=uid and cached.result->'record'->>'id'=child.id::text;
   end loop;
   -- Remove cached acknowledgement bodies for deleted records as well.
   update private.mutations cached set result=jsonb_build_object('record',private.envelope(existing),'conflict',true) where cached.user_id=uid and cached.result->'record'->>'id'=rid::text;
  end if;
  result:=jsonb_build_object('record',private.envelope(existing),'conflict',false);
 end if;
 insert into private.mutations values(uid,mid,result);
 return result;
end $$;
create function private.sync_pull(cursor_value bigint,c jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_user(); result jsonb; last_seq bigint;
begin
 perform private.lock_user(uid); perform private.check_consent(c,'cloud_sync');
 if cursor_value < 0 then raise exception 'invalid_input'; end if;
 select coalesce(jsonb_agg(private.envelope(r) order by changes.seq),'[]'),coalesce(max(changes.seq),cursor_value) into result,last_seq
 from (select * from private.changes where user_id=uid and seq>cursor_value order by seq limit 100) changes
 join public.records r on r.user_id=uid and r.id=changes.record_id;
 return jsonb_build_object('records',result,'cursor',last_seq,'hasMore',exists(select 1 from private.changes where user_id=uid and seq>last_seq));
end $$;

create function private.begin_ai(rid uuid,request_kind text,c jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := private.require_user(); count_today integer; quota integer;
begin
 perform private.lock_user(uid); perform private.check_consent(c,'ai_processing');
 if exists(select 1 from private.ai_requests where user_id=uid and request_id=rid) then raise exception 'duplicate_request'; end if;
 if exists(select 1 from private.ai_requests where user_id=uid and state='running' and started_at>now()-interval '120 seconds') then raise exception 'request_in_progress'; end if;
 quota := case request_kind when 'report' then 3 when 'chat' then 30 when 'plan-draft' then 3 else 0 end;
 select count(*) into count_today from private.ai_requests where user_id=uid and kind=request_kind and (started_at at time zone 'Asia/Shanghai')::date=(now() at time zone 'Asia/Shanghai')::date;
 if count_today>=quota then raise exception 'rate_limited'; end if;
 insert into private.ai_requests(user_id,request_id,kind,state) values(uid,rid,request_kind,'running');
 return jsonb_build_object('accepted',true);
end $$;
create function private.finish_ai(rid uuid,ok boolean,model_name text,input_count bigint,output_count bigint) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_user();
begin
 update private.ai_requests set state=case when ok then 'complete' else 'failed' end,finished_at=now(),model=model_name,input_tokens=input_count,output_tokens=output_count where user_id=uid and request_id=rid and state='running';
end $$;

-- Only verified Edge handlers can invoke writes. This prevents bypassing schema checks,
-- forging AI completion/usage, or writing server-owned version fields via the Data API.
create function public.set_consents(uid uuid,sid uuid,c jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'session_id',sid,'role','authenticated')::text,true);
 return private.set_consents(c);
end $$;
revoke all on function public.set_consents(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.set_consents(uuid,uuid,jsonb) to service_role;
create function public.sync_push(uid uuid,sid uuid,m jsonb,c jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'session_id',sid,'role','authenticated')::text,true);
 return private.sync_push(m,c);
end $$;
revoke all on function public.sync_push(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.sync_push(uuid,uuid,jsonb,jsonb) to service_role;
create function public.sync_pull(uid uuid,sid uuid,cursor_value bigint,c jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'session_id',sid,'role','authenticated')::text,true);
 return private.sync_pull(cursor_value,c);
end $$;
revoke all on function public.sync_pull(uuid,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.sync_pull(uuid,uuid,bigint,jsonb) to service_role;
create function public.begin_ai(uid uuid,sid uuid,rid uuid,request_kind text,c jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'session_id',sid,'role','authenticated')::text,true);
 return private.begin_ai(rid,request_kind,c);
end $$;
revoke all on function public.begin_ai(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.begin_ai(uuid,uuid,uuid,text,jsonb) to service_role;
create function public.finish_ai(uid uuid,sid uuid,rid uuid,ok boolean,model_name text,input_count bigint,output_count bigint) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'session_id',sid,'role','authenticated')::text,true);
 perform private.finish_ai(rid,ok,model_name,input_count,output_count); return;
end $$;
revoke all on function public.finish_ai(uuid,uuid,uuid,boolean,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.finish_ai(uuid,uuid,uuid,boolean,text,bigint,bigint) to service_role;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on all functions in schema private to service_role;
grant execute on function private.require_user(boolean) to authenticated;

-- Deletion state is accessible only to the verified server-side administrative path.
create function public.deletion_job(uid uuid,token_cipher text default null,mark_revoked boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into private.account_state(user_id,deleting) values(uid,true) on conflict(user_id) do update set deleting=true;
 insert into private.deletion_jobs(user_id,encrypted_token,apple_revoked) values(uid,token_cipher,mark_revoked)
 on conflict(user_id) do update set encrypted_token=coalesce(excluded.encrypted_token,private.deletion_jobs.encrypted_token),apple_revoked=private.deletion_jobs.apple_revoked or excluded.apple_revoked;
 select jsonb_build_object('encryptedToken',encrypted_token,'appleRevoked',apple_revoked) into result from private.deletion_jobs where user_id=uid;
 return result;
end $$;
grant all on all tables in schema private to service_role;
revoke all on function public.deletion_job(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.deletion_job(uuid,text,boolean) to service_role;

create function public.clear_cloud(uid uuid,sid uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item public.records; seq bigint;
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'session_id',sid,'role','authenticated')::text,true);
 perform private.lock_user(uid);
 for item in update public.records set deleted=true,payload='{}',version=version+1,updated_at=now() where user_id=uid and not deleted returning * loop
  update private.account_state set head=head+1 where user_id=uid returning head into seq;
  insert into private.changes values(uid,seq,item.id);
 end loop;
 update private.mutations m set result=jsonb_build_object('record',private.envelope(r),'conflict',true) from public.records r where m.user_id=uid and r.user_id=uid and r.id=(m.result->'record'->>'id')::uuid;
 return jsonb_build_object('deleted',true);
end $$;
revoke all on function public.clear_cloud(uuid,uuid) from public,anon,authenticated;
grant execute on function public.clear_cloud(uuid,uuid) to service_role;
