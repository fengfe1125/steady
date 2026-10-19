-- Incremental v2 compatibility only. sync_push keeps its existing lock, conflict,
-- mutation acknowledgement and tombstone behavior; it calls this pure helper.
-- Preserve catalog links when older clients round-trip fields they do not know.
-- Missing means legacy omission; explicit null means an intentional unlink.
-- This pure helper is called inside sync_push's existing per-user transaction lock.
create or replace function private.merge_catalog_payload(record_kind text, previous jsonb, incoming jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare
 result jsonb := incoming;
 item jsonb;
 old_item jsonb;
 items jsonb := '[]'::jsonb;
 field_name text;
begin
 if record_kind = 'profiles' then
  if not (incoming ? 'availableEquipmentIDs') and previous ? 'availableEquipmentIDs' then
   result := result || jsonb_build_object('availableEquipmentIDs',
    case when previous->'equipment' = incoming->'equipment' then previous->'availableEquipmentIDs' else 'null'::jsonb end);
  end if;
  -- Confirmation history survives old clients and scene changes, including future
  -- IDs/versions. Only an explicit value or null replaces this user's history.
  if not (incoming ? 'movementConditions') and previous ? 'movementConditions' then
   result := result || jsonb_build_object('movementConditions', previous->'movementConditions');
  end if;
 elsif record_kind = 'plans' then
  if not (incoming ? 'generationContext') and previous ? 'generationContext' then
   result := result || jsonb_build_object('generationContext', previous->'generationContext');
  elsif jsonb_typeof(incoming->'generationContext') = 'object' and jsonb_typeof(previous->'generationContext') = 'object' then
   -- A v1 client understands the context object but drops these v2 fields.
   -- Preserve each omission separately; null remains an intentional clear.
   foreach field_name in array array['movementConditions','programKind','rulesVersion'] loop
    if not ((incoming->'generationContext') ? field_name) and (previous->'generationContext') ? field_name then
     result := jsonb_set(result, array['generationContext',field_name], previous->'generationContext'->field_name);
    end if;
   end loop;
  end if;
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

