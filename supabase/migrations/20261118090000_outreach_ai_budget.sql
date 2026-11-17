-- Outreach Gemini budget (owner, 2026-11-18): outreach uses Flash-Lite (its own free quota), never the
-- chatbot's model. Calls are counted per quota day (Pacific time, when Google resets free quotas) and
-- stop at 70% of the daily free limit; busy/429 answers set a back-off so later ticks retry, never a
-- tight loop. The daily limit is learned from Google's 429 message ("limit: N") when one arrives.
create table if not exists public.outreach_ai_usage (
  day date primary key,
  calls integer not null default 0,
  errors integer not null default 0,
  backoff_until timestamptz,
  daily_limit integer,
  last_error text check (char_length(last_error) <= 300),
  updated_at timestamptz not null default now()
);
alter table public.outreach_ai_usage enable row level security;
-- Owner reads it in /admin through the server functions only; no direct policies.

-- Takes one call from today's budget: {ok, reason, calls, limit, budget, until}.
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
  return jsonb_build_object('ok', true, 'reason', null, 'calls', r.calls + 1, 'limit', v_limit, 'budget', v_budget, 'until', null);
end;
$$;

-- Records a failed call: error count, back-off and (from a 429 message) the real daily limit.
create or replace function public.app_ox_ai_error(p_secret text, p_day date, p_backoff_until timestamptz, p_limit integer, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  insert into public.outreach_ai_usage (day) values (p_day) on conflict (day) do nothing;
  update public.outreach_ai_usage set
    errors = errors + 1,
    backoff_until = greatest(coalesce(backoff_until, p_backoff_until), p_backoff_until),
    daily_limit = coalesce(p_limit, daily_limit),
    last_error = left(p_error, 300),
    updated_at = now()
  where day = p_day;
end;
$$;

create or replace function public.app_ox_ai_usage(p_secret text, p_day date)
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
    'backoff_until', (select max(u.backoff_until) from public.outreach_ai_usage u)
  );
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.app_ox_ai_take(text, date, integer, numeric)',
    'public.app_ox_ai_error(text, date, timestamptz, integer, text)',
    'public.app_ox_ai_usage(text, date)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;

-- ---------- Neighbourhood-level areas (owner, 2026-11-18) ----------
-- Big cities are covered borough by borough / suburb by suburb: a cell is niche x city x district
-- ('' = the whole town). Prospects remember the district they were found in.
alter table public.outreach_coverage add column if not exists district text not null default '';
alter table public.outreach_coverage drop constraint if exists outreach_coverage_pkey;
alter table public.outreach_coverage add primary key (business_type, country, region, city, district);
alter table public.prospects add column if not exists district text check (char_length(district) <= 80);

create or replace function public.app_ox_coverage(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('t', c.business_type, 'c', c.country, 'r', c.region, 'y', c.city, 'd', c.district, 'done', c.done_at is not null, 'n', c.found))
                   from public.outreach_coverage c), '[]'::jsonb);
end;
$$;

drop function if exists public.app_ox_coverage_mark(text, text, text, text, text, integer, text);
create or replace function public.app_ox_coverage_mark(p_secret text, p_type text, p_country text, p_region text, p_city text, p_district text, p_found integer, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  insert into public.outreach_coverage as c (business_type, country, region, city, district, done_at, found, attempts, error)
  values (p_type, p_country, p_region, p_city, coalesce(p_district, ''), case when p_error is null then now() end, coalesce(p_found, 0), 1, left(p_error, 300))
  on conflict (business_type, country, region, city, district) do update set
    attempts = c.attempts + 1,
    found = c.found + coalesce(p_found, 0),
    error = left(p_error, 300),
    done_at = case when p_error is null or c.attempts + 1 >= 3 then coalesce(c.done_at, now()) else c.done_at end,
    updated_at = now();
end;
$$;

create or replace function public.app_ox_add_prospect(p_secret text, p_row jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_domain text := nullif(lower(p_row ->> 'domain'), '');
  v_email text := nullif(lower(p_row ->> 'email'), '');
begin
  perform private.check_secret(p_secret);
  if exists (select 1 from public.prospects where osm_id = p_row ->> 'osm_id') then return null; end if;
  if v_domain is not null and exists (select 1 from public.prospects where lower(domain) = v_domain) then return null; end if;
  if v_email is not null and (exists (select 1 from public.prospects where lower(email) = v_email)
    or exists (select 1 from public.suppression_list where email = v_email)) then return null; end if;
  insert into public.prospects (search_id, osm_id, name, business_type, city, region, district, country, timezone, website, domain, phone, email, email_source, instagram, osm_tags, lat, lon)
  values ((p_row ->> 'search_id')::uuid, p_row ->> 'osm_id', left(p_row ->> 'name', 160), p_row ->> 'business_type', left(p_row ->> 'city', 80),
          left(p_row ->> 'region', 80), nullif(left(p_row ->> 'district', 80), ''), p_row ->> 'country', p_row ->> 'timezone', left(p_row ->> 'website', 500), v_domain, left(p_row ->> 'phone', 60),
          v_email, case when v_email is not null then 'osm' end, left(p_row ->> 'instagram', 300), coalesce(p_row -> 'osm_tags', '{}'::jsonb),
          (p_row ->> 'lat')::double precision, (p_row ->> 'lon')::double precision)
  on conflict (osm_id) do nothing
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.app_ox_map(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return jsonb_build_object(
    'cells', coalesce((select jsonb_agg(jsonb_build_object('t', c.business_type, 'c', c.country, 'r', c.region, 'y', c.city, 'd', c.district, 'done', c.done_at is not null, 'n', c.found, 'at', c.updated_at))
                       from public.outreach_coverage c), '[]'::jsonb),
    'centres', coalesce((select jsonb_object_agg(substr(key, 11), jsonb_build_object('lat', value -> 'lat', 'lon', value -> 'lon'))
                         from public.outreach_cache where key like 'nominatim:%'), '{}'::jsonb),
    'businesses', coalesce((select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'n', pr.name, 't', pr.business_type, 'y', pr.city, 'r', pr.region, 'c', pr.country, 'a', pr.area, 'd', pr.district,
        'lat', pr.lat, 'lon', pr.lon, 's', pr.status, 'sc', pr.audit_score, 'ls', pr.lead_score, 'w', pr.website is not null,
        'e', coalesce(pr.email, '') <> '', 'ph', coalesce(pr.phone, '') <> '', 'ig', coalesce(pr.instagram, '') <> '',
        'rc', pr.reply_class, 'why', pr.skip_reason, 'note', pr.research ->> 'note', 'f', pr.created_at, 'ck', pr.checked_at,
        'sent', (select min(m.sent_at) from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.step = 0 and m.status = 'sent'),
        'rv', (select m.review_reason from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.step = 0 and m.status = 'review' limit 1),
        'q', exists (select 1 from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.step = 0 and m.status = 'approved')
      )) from public.prospects pr), '[]'::jsonb)
  );
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.app_ox_coverage(text)',
    'public.app_ox_coverage_mark(text, text, text, text, text, text, integer, text)',
    'public.app_ox_add_prospect(text, jsonb)',
    'public.app_ox_map(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;
