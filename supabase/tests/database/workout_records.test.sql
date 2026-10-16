-- Transport/RLS integration. Payload shape is exercised separately by Edge tests.
begin;
create temporary table workout_checks(label text not null);
create function pg_temp.check(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'workout transport failed: %',label; end if; insert into workout_checks values(label); end $$;
create function pg_temp.c(rev int default 1, enabled boolean default true) returns jsonb language sql as $$ select jsonb_build_object('deviceID','cccccccc-cccc-4ccc-8ccc-cccccccccccc','revision',rev,'healthRead',false,'cloudSync',enabled,'aiProcessing',false,'policyVersion','2026-09-23') $$;
create function pg_temp.push(k text,rid uuid,p jsonb,v int,deleted boolean default false,mid uuid default gen_random_uuid()) returns jsonb language sql as $$
 select public.sync_push('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',jsonb_build_object('id',mid,'record',jsonb_build_object('id',rid,'kind',k,'logicalID',rid::text,'payload',p::text,'version',v,'deleted',deleted)),pg_temp.c()) $$;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into auth.sessions(id,user_id,created_at,updated_at) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',now(),now()),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222',now(),now());
select public.set_consents('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',pg_temp.c());
select public.set_consents('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',pg_temp.c());
do $$
declare
 tid uuid := '10000000-0000-4000-8000-000000000001';
 lid uuid := '10000000-0000-4000-8000-000000000002';
 mid uuid := '10000000-0000-4000-8000-000000000003';
 payload jsonb := '{"metadata":{"source":"manual"},"title":"synthetic workout"}';
 r jsonb; p jsonb; caught boolean;
begin
 r:=pg_temp.push('workoutTemplates',tid,payload,0);
 perform pg_temp.check(r->'record'->>'version'='1','template accepted');
 r:=pg_temp.push('workoutLogs',lid,payload,0,false,mid);
 perform pg_temp.check(r->'record'->>'version'='1','log accepted without parent');
 perform pg_temp.check(pg_temp.push('workoutLogs',lid,payload,0,false,mid)=r,'retry mutation idempotent');
 r:=pg_temp.push('workoutLogs',lid,payload||'{"note":"updated"}',1);
 perform pg_temp.check(r->'record'->>'version'='2','history update');
 r:=pg_temp.push('workoutLogs',lid,payload||'{"note":"stale"}',1);
 perform pg_temp.check(r->>'conflict'='true','two device stale write conflicts');
 perform pg_temp.check(((r->'record'->>'payload')::jsonb)->>'note'='updated','conflict preserves authoritative actuals');
 p:=public.sync_pull('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0,pg_temp.c());
 perform pg_temp.check(jsonb_array_length(p->'records')>=2,'owner pulls workout records');
 p:=public.sync_pull('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',0,pg_temp.c());
 perform pg_temp.check(jsonb_array_length(p->'records')=0,'other account cannot pull workouts');
 r:=pg_temp.push('workoutTemplates',tid,'{}',1,true);
 perform pg_temp.check(r->'record'->>'deleted'='true','template deletion tombstone');
 perform pg_temp.check(exists(select 1 from public.records where id=lid and not deleted),'template deletion preserves actual log snapshot');
 r:=pg_temp.push('workoutLogs',lid,'{}',2,true);
 perform pg_temp.check(r->'record'->>'deleted'='true','log deletion tombstone');
 r:=pg_temp.push('workoutLogs',lid,payload,3);
 perform pg_temp.check(r->>'conflict'='true' and r->'record'->>'deleted'='true','old ID cannot revive deleted log');
 caught:=false;
 begin insert into public.records(user_id,id,kind,logical_id,payload) values('11111111-1111-4111-8111-111111111111',gen_random_uuid(),'workoutLogs','wrong',payload);
 exception when check_violation then caught:=true; end;
 perform pg_temp.check(caught,'database rejects mismatched workout identity');
 perform public.set_consents('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',pg_temp.c(2,false));
 caught:=false;
 begin perform pg_temp.push('workoutLogs',gen_random_uuid(),payload,0); exception when others then caught:=true; end;
 perform pg_temp.check(caught,'revoked sync prevents uploads');
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}',true);
set local role authenticated;
do $$ begin if exists(select 1 from public.records where kind in ('workoutTemplates','workoutLogs')) then raise exception 'RLS exposed another account';end if;end $$;
reset role;
select count(*) as passed_workout_transport_checks from workout_checks;
rollback;
