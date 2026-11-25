-- Outreach business pool (owner, 2026-11-25). Overpass from Vercel timed out or answered 502 on every
-- scan from 23 to 25 Nov (30 businesses in 7 days), so discovery now reads a pool imported weekly from
-- Geofabrik country extracts by a GitHub Actions workflow (scripts/outreach-import.ts):
-- - outreach_pool: one row per OSM business inside one of our areas (AREAS in src/lib/outreach/areas.ts),
--   already filtered at import (chains, brands, closed tags, prime addresses, no contact at all).
--   Deduplicated by OSM id and by website domain. `taken_at` = moved into prospects by the scanning job.
--   `gone` = no longer in the latest extract (closed or deleted on OSM).
-- - app_ox_pool_upsert / app_ox_pool_finish: the import (server secret).
-- - app_ox_pool_take: the scanning job takes the best rows of one area (atomic, skip locked).
-- - app_ox_pool_stats: available per country, niche and area (daily summary, workflow report).

create table if not exists public.outreach_pool (
  osm_id text primary key,
  country text not null,
  niche text not null,
  name text not null,
  lat double precision not null,
  lon double precision not null,
  area_key text not null,
  region text not null,
  city text not null,
  district text not null default '',
  website text,
  domain text,
  email text,
  phone text,
  instagram text,
  facebook text,
  opening_hours text,
  tags jsonb not null default '{}'::jsonb,
  -- 1 best (no website + email) … 5 (no website, phone only: WhatsApp queue)
  priority smallint not null default 3,
  imported_at timestamptz not null default now(),
  seen_at timestamptz not null default now(),
  taken_at timestamptz,
  gone boolean not null default false
);
create index if not exists outreach_pool_area_idx on public.outreach_pool (area_key, priority) where taken_at is null and not gone;
create index if not exists outreach_pool_country_idx on public.outreach_pool (country, niche);
create index if not exists outreach_pool_domain_idx on public.outreach_pool (domain) where domain is not null;

alter table public.outreach_pool enable row level security;
create policy "Owner reads the pool" on public.outreach_pool for select to authenticated using ((select public.is_owner()));
revoke all on public.outreach_pool from anon, authenticated;
grant select on public.outreach_pool to authenticated;

-- ---------- Import: upsert a batch ----------
create or replace function public.app_ox_pool_upsert(p_secret text, p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new integer := 0;
  v_updated integer := 0;
  v_dupe integer := 0;
  r jsonb;
  v_domain text;
  v_exists boolean;
begin
  perform private.check_secret(p_secret);
  for r in select * from jsonb_array_elements(p_rows) loop
    v_domain := nullif(lower(r ->> 'domain'), '');
    -- One business per website domain: another OSM object with the same domain is skipped.
    if v_domain is not null and exists (select 1 from public.outreach_pool q where q.domain = v_domain and q.osm_id <> r ->> 'osm_id') then
      v_dupe := v_dupe + 1;
      continue;
    end if;
    v_exists := exists (select 1 from public.outreach_pool q where q.osm_id = r ->> 'osm_id');
    insert into public.outreach_pool as p (osm_id, country, niche, name, lat, lon, area_key, region, city, district, website, domain, email, phone, instagram, facebook, opening_hours, tags, priority)
    values (r ->> 'osm_id', r ->> 'country', r ->> 'niche', left(r ->> 'name', 160), (r ->> 'lat')::double precision, (r ->> 'lon')::double precision,
            r ->> 'area_key', left(r ->> 'region', 80), left(r ->> 'city', 80), coalesce(left(r ->> 'district', 80), ''), left(r ->> 'website', 500), v_domain,
            nullif(lower(r ->> 'email'), ''), left(r ->> 'phone', 60), left(r ->> 'instagram', 300), left(r ->> 'facebook', 300), left(r ->> 'opening_hours', 200),
            coalesce(r -> 'tags', '{}'::jsonb), coalesce((r ->> 'priority')::smallint, 3))
    on conflict (osm_id) do update set
      niche = excluded.niche, name = excluded.name, lat = excluded.lat, lon = excluded.lon, area_key = excluded.area_key, region = excluded.region,
      city = excluded.city, district = excluded.district, website = excluded.website, domain = excluded.domain, email = excluded.email,
      phone = excluded.phone, instagram = excluded.instagram, facebook = excluded.facebook, opening_hours = excluded.opening_hours,
      tags = excluded.tags, priority = excluded.priority, seen_at = now(), gone = false;
    if v_exists then v_updated := v_updated + 1; else v_new := v_new + 1; end if;
  end loop;
  return jsonb_build_object('new', v_new, 'updated', v_updated, 'duplicate_domain', v_dupe);
end;
$$;

-- ---------- Import: rows of a country not seen in this run are gone (closed or removed on OSM) ----------
create or replace function public.app_ox_pool_finish(p_secret text, p_country text, p_since timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_gone integer;
begin
  perform private.check_secret(p_secret);
  update public.outreach_pool set gone = true where country = p_country and seen_at < p_since and not gone;
  get diagnostics v_gone = row_count;
  return v_gone;
end;
$$;

-- ---------- Scanning: take the best untaken rows of one area ----------
-- Order: priority (no website + email, website + email, website, no website + social, phone only),
-- then a stable order. Rows whose OSM id or domain is already a prospect are marked taken and skipped.
create or replace function public.app_ox_pool_take(p_secret text, p_area_key text, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  perform private.check_secret(p_secret);
  update public.outreach_pool q set taken_at = now()
  where q.area_key = p_area_key and q.taken_at is null and not q.gone
    and (exists (select 1 from public.prospects x where x.osm_id = q.osm_id)
         or (q.domain is not null and exists (select 1 from public.prospects x where lower(x.domain) = q.domain)));
  with picked as (
    select q.osm_id from public.outreach_pool q
    where q.area_key = p_area_key and q.taken_at is null and not q.gone
    order by q.priority, q.osm_id
    limit greatest(p_limit, 0)
    for update skip locked
  ), upd as (
    update public.outreach_pool q set taken_at = now() from picked where q.osm_id = picked.osm_id returning q.*
  )
  select coalesce(jsonb_agg(to_jsonb(upd) - 'imported_at' - 'seen_at' - 'taken_at' - 'gone'), '[]'::jsonb) into v_rows from upd;
  return jsonb_build_object(
    'has_pool', exists (select 1 from public.outreach_pool q where q.area_key = p_area_key),
    'rows', v_rows,
    'left', coalesce((select jsonb_object_agg(niche, n) from (select q.niche, count(*) n from public.outreach_pool q
                      where q.area_key = p_area_key and q.taken_at is null and not q.gone group by q.niche) s), '{}'::jsonb)
  );
end;
$$;

-- ---------- Stats: per country, niche and area ----------
create or replace function public.app_ox_pool_stats(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return jsonb_build_object(
    'countries', coalesce((select jsonb_agg(jsonb_build_object('country', country, 'total', total, 'email', email, 'website', website, 'no_website', no_website, 'available', available, 'available_email', available_email) order by country)
      from (select q.country, count(*) total, count(q.email) email, count(q.website) website, count(*) filter (where q.website is null) no_website,
                   count(*) filter (where q.taken_at is null) available, count(*) filter (where q.taken_at is null and q.email is not null) available_email
            from public.outreach_pool q where not q.gone group by q.country) s), '[]'::jsonb),
    'niches', coalesce((select jsonb_agg(jsonb_build_object('country', country, 'niche', niche, 'total', total, 'email', email, 'no_website', no_website, 'available', available) order by country, total desc)
      from (select q.country, q.niche, count(*) total, count(q.email) email, count(*) filter (where q.website is null) no_website, count(*) filter (where q.taken_at is null) available
            from public.outreach_pool q where not q.gone group by q.country, q.niche) s), '[]'::jsonb),
    'areas', coalesce((select jsonb_object_agg(area_key, jsonb_build_object('total', total, 'available', available, 'available_email', available_email))
      from (select q.area_key, count(*) total, count(*) filter (where q.taken_at is null) available, count(*) filter (where q.taken_at is null and q.email is not null) available_email
            from public.outreach_pool q where not q.gone group by q.area_key) s), '{}'::jsonb),
    'imported_at', (select max(q.seen_at) from public.outreach_pool q)
  );
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.app_ox_pool_upsert(text, jsonb)',
    'public.app_ox_pool_finish(text, text, timestamptz)',
    'public.app_ox_pool_take(text, text, integer)',
    'public.app_ox_pool_stats(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;

-- Leicester cells that only failed because Overpass was busy start again from the pool.
update public.outreach_coverage set attempts = 0, done_at = null, error = null
where done_at is null and error ~* 'busy|timed out|timeout|abort|No time left';
