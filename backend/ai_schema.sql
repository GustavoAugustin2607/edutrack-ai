-- EduTrack AI generation ledger and atomic per-user rate limiter.
-- Apply only to the dedicated EduTrack Supabase project.

create table if not exists public.ai_generations (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  kind text not null check (kind in ('quiz', 'flashcards', 'plan', 'explain')),
  request_payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  result jsonb,
  error jsonb,
  attempt_count integer not null default 1 check (attempt_count between 1 and 10),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  primary key (user_id, request_id),
  constraint ai_generation_request_is_object check (
    jsonb_typeof(request_payload) = 'object'
    and octet_length(request_payload::text) <= 65536
  ),
  constraint ai_generation_terminal_payload check (
    (status = 'pending' and result is null and error is null and completed_at is null)
    or (status = 'completed' and result is not null and error is null and completed_at is not null)
    or (status = 'failed' and result is null and error is not null and completed_at is not null)
  )
);

create index if not exists ai_generations_user_created_idx
  on public.ai_generations (user_id, created_at desc);

alter table public.ai_generations enable row level security;
alter table public.ai_generations force row level security;

-- There are intentionally no client-facing policies. Only the Edge Function's
-- service-role client may inspect or mutate this private ledger.
revoke all on table public.ai_generations from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_generations to service_role;

create or replace function public.claim_ai_generation(
  p_user_id uuid,
  p_request_id uuid,
  p_request_hash text,
  p_kind text,
  p_request_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.ai_generations%rowtype;
  minute_count integer;
  day_count integer;
  retry_seconds integer;
begin
  if p_user_id is null or p_request_id is null then
    raise exception 'user_id and request_id are required' using errcode = '22023';
  end if;
  if p_request_hash is null or p_request_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid request hash' using errcode = '22023';
  end if;
  if p_kind is null or p_kind not in ('quiz', 'flashcards', 'plan', 'explain') then
    raise exception 'invalid AI generation kind' using errcode = '22023';
  end if;
  if p_request_payload is null
    or jsonb_typeof(p_request_payload) <> 'object'
    or octet_length(p_request_payload::text) > 65536 then
    raise exception 'invalid request payload' using errcode = '22023';
  end if;

  -- Serialize claims for one user so concurrent invocations cannot race past
  -- either limit. The constant is a namespace seed for this application.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 1357911)
  );

  select *
  into existing
  from public.ai_generations
  where user_id = p_user_id and request_id = p_request_id;

  if found then
    if existing.request_hash <> p_request_hash then
      return jsonb_build_object('state', 'conflict');
    end if;
    if existing.status = 'completed' then
      return jsonb_build_object('state', 'completed', 'result', existing.result);
    end if;
    if existing.status = 'failed' then
      return jsonb_build_object('state', 'failed', 'error', existing.error);
    end if;

    -- A terminated worker may leave a pending claim. The same request may take
    -- over after two minutes without consuming another rate-limit slot.
    if existing.updated_at < clock_timestamp() - interval '2 minutes'
      and existing.attempt_count < 10 then
      update public.ai_generations
      set updated_at = clock_timestamp(), attempt_count = attempt_count + 1
      where user_id = p_user_id and request_id = p_request_id;
      return jsonb_build_object('state', 'claimed', 'recovered', true);
    end if;

    return jsonb_build_object('state', 'pending');
  end if;

  select
    count(*) filter (where created_at > clock_timestamp() - interval '1 minute'),
    count(*) filter (where created_at > clock_timestamp() - interval '1 day')
  into minute_count, day_count
  from public.ai_generations
  where user_id = p_user_id;

  if minute_count >= 5 then
    select greatest(
      1,
      ceil(extract(epoch from (
        min(created_at) + interval '1 minute' - clock_timestamp()
      )))::integer
    )
    into retry_seconds
    from public.ai_generations
    where user_id = p_user_id
      and created_at > clock_timestamp() - interval '1 minute';

    return jsonb_build_object(
      'state', 'rate_limited',
      'window', 'minute',
      'retry_after', coalesce(retry_seconds, 60)
    );
  end if;

  if day_count >= 20 then
    select greatest(
      1,
      ceil(extract(epoch from (
        min(created_at) + interval '1 day' - clock_timestamp()
      )))::integer
    )
    into retry_seconds
    from public.ai_generations
    where user_id = p_user_id
      and created_at > clock_timestamp() - interval '1 day';

    return jsonb_build_object(
      'state', 'rate_limited',
      'window', 'day',
      'retry_after', coalesce(retry_seconds, 86400)
    );
  end if;

  insert into public.ai_generations (
    user_id,
    request_id,
    request_hash,
    kind,
    request_payload
  ) values (
    p_user_id,
    p_request_id,
    p_request_hash,
    p_kind,
    p_request_payload
  );

  return jsonb_build_object('state', 'claimed', 'recovered', false);
end;
$$;

revoke all on function public.claim_ai_generation(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.claim_ai_generation(uuid, uuid, text, text, jsonb)
  to service_role;
