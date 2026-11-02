-- Private local inference queue. No browser can read the worker credential or jobs.
create table public.local_ai_host (
  id boolean primary key default true check(id),
  token_hash text not null,
  enabled boolean not null default true,
  online boolean not null default false,
  last_seen timestamptz,
  model text not null default 'qwen3.5:4b'
);
create table public.local_ai_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'queued' check(status in ('queued','running','done','failed')),
  result jsonb,
  error text,
  lease uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 minutes')
);
create index local_ai_jobs_pending on public.local_ai_jobs(status, created_at);
alter table public.local_ai_host enable row level security;
alter table public.local_ai_host force row level security;
alter table public.local_ai_jobs enable row level security;
alter table public.local_ai_jobs force row level security;
revoke all on public.local_ai_host, public.local_ai_jobs from public, anon, authenticated;
grant all on public.local_ai_host, public.local_ai_jobs to service_role;

-- Atomic capacity check; only the authenticated Edge Function's service client can enqueue.
create function public.enqueue_local_ai(p_id uuid, p_user uuid, p_payload jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(91374621);
  delete from public.local_ai_jobs where expires_at < now();
  if exists(select 1 from public.local_ai_jobs where user_id = p_user and status in ('queued','running')) then
    raise exception 'Uma geração sua já está em andamento.';
  end if;
  if (select count(*) from public.local_ai_jobs where status in ('queued','running')) >= 3 then
    raise exception 'A fila de IA está cheia. Aguarde a geração atual terminar.';
  end if;
  insert into public.local_ai_jobs(id,user_id,payload) values(p_id,p_user,p_payload);
end $$;
revoke all on function public.enqueue_local_ai(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_local_ai(uuid,uuid,jsonb) to service_role;

-- Narrow worker capability: heartbeat, lease one inference job, or finish that lease.
-- This token does not provide database, account, or workspace access.
create function public.local_ai_worker(p_token text, p_action text, p_id uuid default null, p_lease uuid default null, p_result jsonb default null, p_error text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare j public.local_ai_jobs%rowtype;
begin
  if p_token is null or length(p_token) <> 64 or not exists(
    select 1 from public.local_ai_host where id and enabled
      and token_hash = encode(sha256(convert_to(p_token,'UTF8')),'hex')
  ) then raise exception 'Unauthorized worker' using errcode = '42501'; end if;
  if p_action = 'offline' then
    update public.local_ai_host set online=false, last_seen=now() where id;
    update public.local_ai_jobs set status='failed', payload='{}', error='A IA foi desligada. Tente novamente quando estiver disponível.' where status in ('queued','running');
    return '{}'::jsonb;
  end if;
  update public.local_ai_host set online=true,last_seen=now() where id;
  if p_action = 'heartbeat' then return '{}'::jsonb; end if;
  if p_action = 'claim' then
    delete from public.local_ai_jobs where expires_at < now();
    select * into j from public.local_ai_jobs where status='queued' order by created_at for update skip locked limit 1;
    if not found then return null; end if;
    update public.local_ai_jobs set status='running',lease=gen_random_uuid() where id=j.id returning * into j;
    return jsonb_build_object('id',j.id,'lease',j.lease,'payload',j.payload);
  end if;
  if p_action = 'finish' then
    if p_result is not null and octet_length(p_result::text) > 100000 then raise exception 'Result too large'; end if;
    update public.local_ai_jobs set status=case when p_error is null then 'done' else 'failed' end,
      result=p_result,error=left(p_error,300)
      where id=p_id and lease=p_lease and status='running' and expires_at>now();
    return jsonb_build_object('accepted',found);
  end if;
  raise exception 'Unknown action';
end $$;
revoke all on function public.local_ai_worker(text,text,uuid,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.local_ai_worker(text,text,uuid,uuid,jsonb,text) to service_role;
