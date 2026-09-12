-- Shared counters are authoritative across regions and server instances.
create table public.generation_quotas (
  key text primary key,
  count integer not null check (count >= 0),
  reset_at timestamptz not null
);
create index generation_quotas_expiry on public.generation_quotas (reset_at);
alter table public.generation_quotas enable row level security;
revoke all on public.generation_quotas from public, anon, authenticated;
grant select, insert, update, delete on public.generation_quotas to service_role;

create function public.reserve_generation_quota(
  p_kind text,
  p_client_hash text,
  p_client_limit integer,
  p_global_limit integer,
  p_burst_limit integer
)
returns table (allowed boolean, reason text, retry_after_seconds integer)
language plpgsql
security invoker
set search_path = ''
set lock_timeout = '2s'
set statement_timeout = '4s'
as $$
declare
  v_now timestamptz;
  v_day_end timestamptz;
  v_minute_end timestamptz;
  v_keys text[];
  v_limits integer[];
  v_resets timestamptz[];
  v_reasons text[];
  v_count integer;
  i integer;
begin
  if p_kind is null or p_kind not in ('report', 'paid')
    or p_client_hash is null or p_client_hash !~ '^[a-f0-9]{64}$'
    or p_client_limit is null or p_client_limit not between 1 and 10000
    or p_global_limit is null or p_global_limit not between 1 and 1000000
    or p_burst_limit is null or p_burst_limit not between 1 and 100 then
    raise exception 'Invalid quota parameters';
  end if;

  -- Short transaction-wide lock: all check-and-increment operations serialize.
  -- No network or AI work happens while this lock is held.
  perform pg_catalog.pg_advisory_xact_lock(187462901, 1);
  v_now := pg_catalog.clock_timestamp();
  v_day_end := (date_trunc('day', v_now at time zone 'UTC') + interval '1 day') at time zone 'UTC';
  v_minute_end := date_trunc('minute', v_now) + interval '1 minute';

  -- Bound retention, including identities that never return.
  delete from public.generation_quotas where reset_at <= v_now;

  v_keys := array[p_kind || ':global', p_kind || ':client:' || p_client_hash];
  v_limits := array[p_global_limit, p_client_limit];
  v_resets := array[v_day_end, v_day_end];
  v_reasons := array['global-daily', 'client-daily'];
  if p_kind = 'report' then
    v_keys := v_keys || ('burst:' || p_client_hash);
    v_limits := v_limits || p_burst_limit;
    v_resets := v_resets || v_minute_end;
    v_reasons := v_reasons || 'burst'::text;
  end if;

  -- Check everything before writing anything. Denials never create identity rows.
  for i in 1..array_length(v_keys, 1) loop
    select q.count into v_count from public.generation_quotas q where q.key = v_keys[i];
    if coalesce(v_count, 0) >= v_limits[i] then
      return query select false, v_reasons[i],
        greatest(1, ceil(extract(epoch from (v_resets[i] - v_now)))::integer);
      return;
    end if;
  end loop;

  for i in 1..array_length(v_keys, 1) loop
    insert into public.generation_quotas (key, count, reset_at)
    values (v_keys[i], 1, v_resets[i])
    on conflict (key) do update set count = public.generation_quotas.count + 1;
  end loop;
  return query select true, 'ok'::text, 0;
end;
$$;

revoke all on function public.reserve_generation_quota(text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_generation_quota(text, text, integer, integer, integer)
  to service_role;
