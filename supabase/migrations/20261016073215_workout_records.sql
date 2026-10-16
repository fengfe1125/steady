-- Additive, top-level workout entities. Existing account RLS/outbox/tombstones apply.
alter table public.records drop constraint records_kind_check;
alter table public.records add constraint records_kind_check check
 (kind in ('profiles','summaries','reports','conversations','messages','plans','sessions','notes','workoutTemplates','workoutLogs'));
-- Client/server validators own the detailed payload shape. Keep unrelated data untouched.
alter table public.records add constraint workout_record_identity check
 (kind not in ('workoutTemplates','workoutLogs') or (parent_id is null and lower(logical_id)=id::text));
