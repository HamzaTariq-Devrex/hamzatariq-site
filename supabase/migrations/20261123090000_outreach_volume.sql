-- Outreach lead volume (owner, 2026-11-23).
-- 1. Coverage cells return attempts, last try and last error, so a cell that keeps failing moves to the
--    back of its area instead of blocking it (Leicester's gym cell blocked scanning 19-23 Nov).
-- 2. app_ox_coverage_mark(p_attempt): a busy Overpass is noted without counting one of the 3 tries.
-- 3. Emails found in an Instagram bio linked from the business's own site (source 'instagram').
-- 4. Gemini call log, so /admin shows calls in the owner's day (PKT) next to Google's quota day (Pacific).
-- 5. Scanning gets its own pg_cron job (/api/outreach/discover every 10 minutes), apart from the tick.

-- ---------- 1. Coverage with attempts ----------
create or replace function public.app_ox_coverage(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('t', c.business_type, 'c', c.country, 'r', c.region, 'y', c.city, 'd', c.district,
                                                       'done', c.done_at is not null, 'n', c.found, 'a', c.attempts, 'at', c.updated_at, 'e', c.error))
                   from public.outreach_coverage c), '[]'::jsonb);
end;
$$;

-- ---------- 2. Mark a cell; p_attempt = false for outside outages ----------
drop function if exists public.app_ox_coverage_mark(text, text, text, text, text, text, integer, text);
create or replace function public.app_ox_coverage_mark(p_secret text, p_type text, p_country text, p_region text, p_city text, p_district text, p_found integer, p_error text, p_attempt boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_step integer := case when p_attempt then 1 else 0 end;
begin
  perform private.check_secret(p_secret);
  insert into public.outreach_coverage as c (business_type, country, region, city, district, done_at, found, attempts, error)
  values (p_type, p_country, p_region, p_city, coalesce(p_district, ''), case when p_error is null then now() end, coalesce(p_found, 0), v_step, left(p_error, 300))
  on conflict (business_type, country, region, city, district) do update set
    attempts = c.attempts + v_step,
    found = c.found + coalesce(p_found, 0),
    error = left(p_error, 300),
    done_at = case when p_error is null or (p_attempt and c.attempts + 1 >= 3) then coalesce(c.done_at, now()) else c.done_at end,
    updated_at = now();
end;
$$;

-- Cells that only ever failed because Overpass was busy or the run's time ran out get their tries back,
-- including cells marked done after 3 such failures with nothing found (many Leicester niches).
update public.outreach_coverage
set attempts = 0, done_at = null
where found = 0 and (error ~* 'timeout|timed out|abort|busy|answered (429|502|503|504)|No time left');
-- Cells that hit the old cap of 25 new businesses are searched again for the rest (prospects are
-- de-duplicated by OSM id, so nobody is added twice).
update public.outreach_coverage
set done_at = null, attempts = 0
where found >= 25 and done_at is not null;

-- ---------- 3. Email from an Instagram bio ----------
alter table public.prospects drop constraint if exists prospects_email_source_check;
alter table public.prospects add constraint prospects_email_source_check check (email_source in ('osm', 'contact-page', 'facebook', 'instagram'));

-- ---------- 4. Gemini call log ----------
create table if not exists public.outreach_ai_calls (
  id bigint generated always as identity primary key,
  at timestamptz not null default now()
);
create index if not exists outreach_ai_calls_at_idx on public.outreach_ai_calls (at);
alter table public.outreach_ai_calls enable row level security;
create policy "Owner reads AI calls" on public.outreach_ai_calls for select to authenticated using ((select public.is_owner()));
revoke all on public.outreach_ai_calls from anon, authenticated;
grant select on public.outreach_ai_calls to authenticated;

-- Backfill: today's calls already counted per quota day can't be split by hour; the log starts now.

create or replace function public.app_ox_ai_take(p_secret text, p_day date, p_default_limit integer, p_share numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.outreach_ai_usage;
  v_limit integer;
  v_budget integer;
  v_backoff timestamptz;
begin
  perform private.check_secret(p_secret);
  insert into public.outreach_ai_usage (day) values (p_day) on conflict (day) do nothing;
  select * into r from public.outreach_ai_usage where day = p_day for update;
  -- A learned limit carries over from earlier days.
  v_limit := coalesce(r.daily_limit, (select u.daily_limit from public.outreach_ai_usage u where u.daily_limit is not null order by u.day desc limit 1), p_default_limit);
  v_budget := floor(v_limit * p_share);
  v_backoff := (select max(u.backoff_until) from public.outreach_ai_usage u);
  if v_backoff is not null and v_backoff > now() then
    return jsonb_build_object('ok', false, 'reason', 'backoff', 'calls', r.calls, 'limit', v_limit, 'budget', v_budget, 'until', v_backoff);
  end if;
  if r.calls >= v_budget then
    return jsonb_build_object('ok', false, 'reason', 'budget', 'calls', r.calls, 'limit', v_limit, 'budget', v_budget, 'until', null);
  end if;
  update public.outreach_ai_usage set calls = calls + 1, updated_at = now() where day = p_day;
  insert into public.outreach_ai_calls (at) values (now());
  delete from public.outreach_ai_calls where at < now() - interval '30 days';
  return jsonb_build_object('ok', true, 'reason', null, 'calls', r.calls + 1, 'limit', v_limit, 'budget', v_budget, 'until', null);
end;
$$;

drop function if exists public.app_ox_ai_usage(text, date);
create or replace function public.app_ox_ai_usage(p_secret text, p_day date, p_since timestamptz default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return jsonb_build_object(
    'today', (select to_jsonb(u) from public.outreach_ai_usage u where u.day = p_day),
    'learned_limit', (select u.daily_limit from public.outreach_ai_usage u where u.daily_limit is not null order by u.day desc limit 1),
    'backoff_until', (select max(u.backoff_until) from public.outreach_ai_usage u),
    'since_calls', (select count(*) from public.outreach_ai_calls k where k.at >= coalesce(p_since, now() - interval '1 day')),
    'last_24h', (select count(*) from public.outreach_ai_calls k where k.at >= now() - interval '1 day')
  );
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.app_ox_coverage(text)',
    'public.app_ox_coverage_mark(text, text, text, text, text, text, integer, text, boolean)',
    'public.app_ox_ai_take(text, date, integer, numeric)',
    'public.app_ox_ai_usage(text, date, timestamptz)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;

-- ---------- 5. Scanning job: every 10 minutes (minute 3, 13, 23…), same Vault secret as the tick ----------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'outreach-discover') then
    perform cron.unschedule('outreach-discover');
  end if;
end;
$$;
select cron.schedule(
  'outreach-discover',
  '3-59/10 * * * *',
  $job$
  select net.http_get(
    url := 'https://hamzatariq.site/api/outreach/discover',
    headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
    timeout_milliseconds := 60000
  )
  from vault.decrypted_secrets s
  where s.name = 'outreach_cron_secret';
  $job$
);
