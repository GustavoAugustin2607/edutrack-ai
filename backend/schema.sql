-- EduTrack AI: apply ONLY to its dedicated new Supabase project.
-- Each account owns an atomic workspace document. Revision checks prevent silent
-- overwrites between devices; no service-role key is needed in the frontend.
create table public.study_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint valid_workspace check (coalesce((
    jsonb_typeof(payload) = 'object' and
    (payload->>'schema_version')::integer = 1 and
    jsonb_typeof(payload->'subjects') = 'array' and
    jsonb_typeof(payload->'tasks') = 'array' and
    jsonb_typeof(payload->'sessions') = 'array' and
    jsonb_typeof(payload->'cards') = 'array' and
    jsonb_typeof(payload->'blocks') = 'array' and
    jsonb_typeof(payload->'settings') = 'object' and
    octet_length(payload::text) <= 2097152
  ),false))
);
alter table public.study_workspaces enable row level security;
revoke all on public.study_workspaces from anon;
grant select, insert, update, delete on public.study_workspaces to authenticated;
create policy own_select on public.study_workspaces for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.study_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.study_workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.study_workspaces for delete to authenticated using ((select auth.uid()) = user_id);

create function public.save_study_workspace(new_payload jsonb, expected_revision integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare new_revision integer; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if expected_revision < 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
  if expected_revision = 0 then
    insert into public.study_workspaces(user_id,payload,revision)
    values (uid,new_payload,1)
    on conflict(user_id) do nothing returning revision into new_revision;
  else
    update public.study_workspaces set payload = new_payload,
      revision = revision + 1, updated_at = now()
      where user_id = uid and revision = expected_revision
      returning revision into new_revision;
  end if;
  if new_revision is null then raise exception 'Workspace changed on another device' using errcode = '40001'; end if;
  return new_revision;
end;
$$;
revoke all on function public.save_study_workspace(jsonb,integer) from public,anon;
grant execute on function public.save_study_workspace(jsonb,integer) to authenticated;

-- Read-only analytics views retain RLS. These do not bypass ownership.
create view public.subjects with (security_invoker = true) as
select user_id, item->>'id' as id, item->>'name' as name,
  item->>'teacher' as teacher, (item->>'hours')::numeric as hours,
  item->>'description' as description, (item->>'archived')::boolean as archived
from public.study_workspaces cross join lateral jsonb_array_elements(payload->'subjects') item;
create view public.academic_tasks with (security_invoker = true) as
select user_id, item->>'id' as id, item->>'subject_id' as subject_id,
  item->>'title' as title, item->>'status' as status,
  item->>'due_date' as due_date, (item->>'estimated_minutes')::numeric as estimated_minutes,
  item->>'completed_at' as completed_at
from public.study_workspaces cross join lateral jsonb_array_elements(payload->'tasks') item;
revoke all on public.subjects,public.academic_tasks from anon;
grant select on public.subjects,public.academic_tasks to authenticated;
