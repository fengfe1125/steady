-- Preserve catalog links when older clients round-trip fields they do not know.
-- Missing means legacy omission; explicit null means an intentional unlink.
-- This pure helper is called inside sync_push's existing per-user transaction lock.
create function private.merge_catalog_payload(record_kind text, previous jsonb, incoming jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare
 result jsonb := incoming;
 item jsonb;
 old_item jsonb;
 items jsonb := '[]'::jsonb;
 field_name text;
begin
 if record_kind = 'profiles' and not (incoming ? 'availableEquipmentIDs') and previous ? 'availableEquipmentIDs' then
  result := result || jsonb_build_object('availableEquipmentIDs',
   case when previous->'equipment' = incoming->'equipment' then previous->'availableEquipmentIDs' else 'null'::jsonb end);
 elsif record_kind = 'plans' and not (incoming ? 'generationContext') and previous ? 'generationContext' then
  result := result || jsonb_build_object('generationContext', previous->'generationContext');
 elsif record_kind = 'sessions' then
  if (select count(*) <> count(distinct lower(x->>'id')) from jsonb_array_elements(incoming->'exercises') x)
   or (select count(*) <> count(distinct lower(x->>'id')) from jsonb_array_elements(previous->'exercises') x) then
   raise exception 'invalid_input';
  end if;
  for item in select value from jsonb_array_elements(incoming->'exercises') loop
   select value into old_item from jsonb_array_elements(previous->'exercises')
    where lower(value->>'id') = lower(item->>'id');
   if item ? 'catalogID' then
    if item->'catalogID' = 'null'::jsonb then
     item := item || jsonb_build_object('catalogID',null,'catalogVersion',null,'templateID',null,'role',null);
    end if;
   elsif old_item is not null then
    if item->'name' = old_item->'name' then
     foreach field_name in array array['catalogID','catalogVersion','templateID','role'] loop
      if not (item ? field_name) and old_item ? field_name then
       item := item || jsonb_build_object(field_name, old_item->field_name);
      end if;
     end loop;
     if item->'prescription' is distinct from old_item->'prescription' then
      item := item || jsonb_build_object('templateID',null);
     end if;
    else
     item := item || jsonb_build_object('catalogID',null,'catalogVersion',null,'templateID',null,'role',null);
    end if;
   end if;
   items := items || jsonb_build_array(item);
  end loop;
  result := jsonb_set(result, '{exercises}', items);
 end if;
 return result;
end $$;
revoke all on function private.merge_catalog_payload(text,jsonb,jsonb) from public,anon,authenticated;

create or replace function private.sync_push(m jsonb,c jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
  if existing.id is not null and not (record->>'deleted')::boolean then
   payload := private.merge_catalog_payload(record->>'kind', existing.payload, payload);
  end if;
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
