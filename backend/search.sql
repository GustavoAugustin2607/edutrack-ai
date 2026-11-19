-- Hybrid search: the student's subjects whose name matches OR that have
-- overdue tasks. Runs as the caller, so the views' RLS keeps each student
-- inside their own data. Called with supabase.rpc('search_subjects', {...}).
create or replace function public.search_subjects(p_name text default null, p_overdue boolean default false)
returns table (id text, name text, overdue_tasks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id, s.name,
    (select count(*) from public.academic_tasks t
      where t.subject_id = s.id and t.user_id = s.user_id
        and t.status <> 'done' and t.due_date <> ''
        and t.due_date < to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD')) as overdue_tasks
  from public.subjects s
  where s.user_id = (select auth.uid())
    and (
      (nullif(trim(p_name), '') is not null and s.name ilike '%' || trim(p_name) || '%')
      or (p_overdue and exists (
        select 1 from public.academic_tasks t
        where t.subject_id = s.id and t.user_id = s.user_id
          and t.status <> 'done' and t.due_date <> ''
          and t.due_date < to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD')))
    )
  order by s.name;
$$;

revoke all on function public.search_subjects(text, boolean) from public, anon;
grant execute on function public.search_subjects(text, boolean) to authenticated;
