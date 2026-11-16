-- SEO Command Center (owner, 2026-11-16): Search Console, URL Inspection, sitemaps, CrUX, Bing and
-- our own crawl, stored daily; opportunities, issues and keyword ideas computed from that data; a
-- fix queue that a scheduled Claude session applies (docs/SEO_AUTOPILOT.md). Real data only.
-- Background jobs write through app_seo_* functions with the server secret; the owner reads through
-- RLS and the app_admin_seo_* functions (called after the owner check, like the rest of /admin).

-- ---------- Search data (Google Search Console, Bing Webmaster Tools) ----------
-- One table for every grouping: page = '' and query = '' is the day's total, page only is a page
-- row, query only a query row, both a page x query row. position is the average position.
create table if not exists public.seo_search (
  engine text not null check (engine in ('google', 'bing')),
  day date not null,
  page text not null default '',
  query text not null default '',
  clicks integer not null default 0,
  impressions integer not null default 0,
  position real,
  primary key (engine, day, page, query)
);
create index if not exists seo_search_query_idx on public.seo_search (engine, query, day) where query <> '';
create index if not exists seo_search_page_idx on public.seo_search (engine, page, day) where page <> '';
alter table public.seo_search enable row level security;
create policy "Owner reads search data" on public.seo_search for select to authenticated using ((select public.is_owner()));

-- ---------- Pages (sitemap URLs: our crawl + Google's index status) ----------
create table if not exists public.seo_pages (
  path text primary key,
  template text not null,
  in_sitemap boolean not null default true,
  crawled_at timestamptz,
  status integer,
  redirect_to text,
  response_ms integer,
  title text,
  description text,
  canonical text,
  has_og boolean,
  has_jsonld boolean,
  noindex boolean,
  h1_count integer,
  words integer,
  images_missing_alt integer,
  links_out text[] not null default '{}',
  external_links text[] not null default '{}',
  inspected_at timestamptz,
  index_verdict text,
  coverage_state text,
  robots_state text,
  indexing_state text,
  page_fetch_state text,
  google_canonical text,
  last_google_crawl timestamptz
);
alter table public.seo_pages enable row level security;
create policy "Owner reads seo pages" on public.seo_pages for select to authenticated using ((select public.is_owner()));

-- Outside links found by the crawl, checked once a week.
create table if not exists public.seo_links (
  url text primary key,
  status integer,
  error text,
  checked_at timestamptz,
  found_on text[] not null default '{}'
);
alter table public.seo_links enable row level security;
create policy "Owner reads seo links" on public.seo_links for select to authenticated using ((select public.is_owner()));

-- ---------- Core Web Vitals per template (PageSpeed Insights: CrUX field data + Lighthouse lab) ----------
create table if not exists public.seo_cwv (
  template text not null,
  day date not null,
  url text not null,
  performance integer,
  lab_lcp_ms integer,
  lab_cls real,
  lab_tbt_ms integer,
  field_lcp_ms integer,
  field_inp_ms integer,
  field_cls real,
  field_category text,
  field_source text,
  primary key (template, day)
);
alter table public.seo_cwv enable row level security;
create policy "Owner reads cwv" on public.seo_cwv for select to authenticated using ((select public.is_owner()));

-- ---------- Sitemaps as Search Console sees them ----------
create table if not exists public.seo_sitemaps (
  path text primary key,
  last_submitted timestamptz,
  last_downloaded timestamptz,
  is_pending boolean,
  errors integer,
  warnings integer,
  submitted integer,
  indexed integer,
  synced_at timestamptz not null default now()
);
alter table public.seo_sitemaps enable row level security;
create policy "Owner reads sitemaps" on public.seo_sitemaps for select to authenticated using ((select public.is_owner()));

-- ---------- Issues (crawl problems; replaced by every analysis, resolved ones kept) ----------
create table if not exists public.seo_issues (
  path text not null,
  type text not null,
  severity text not null check (severity in ('error', 'warning', 'notice')),
  detail text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz,
  fix_key text,
  primary key (path, type)
);
create index if not exists seo_issues_open_idx on public.seo_issues (severity, last_seen desc) where resolved_at is null;
alter table public.seo_issues enable row level security;
create policy "Owner reads issues" on public.seo_issues for select to authenticated using ((select public.is_owner()));

-- ---------- Opportunities (recomputed daily from the last 28 days) ----------
create table if not exists public.seo_opportunities (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('striking', 'low_ctr', 'missing_page', 'cannibal', 'not_indexed', 'losing')),
  query text,
  page text,
  score real not null default 0,
  data jsonb not null default '{}'::jsonb,
  fix_key text,
  computed_at timestamptz not null default now()
);
create index if not exists seo_opportunities_kind_idx on public.seo_opportunities (kind, score desc);
alter table public.seo_opportunities enable row level security;
create policy "Owner reads opportunities" on public.seo_opportunities for select to authenticated using ((select public.is_owner()));

-- ---------- Keyword ideas ----------
create table if not exists public.seo_keywords (
  keyword text primary key,
  sources text[] not null default '{}',
  intent text,
  cluster text,
  impressions integer not null default 0,
  clicks integer not null default 0,
  position real,
  page text,
  has_page boolean not null default false,
  status text not null default 'new' check (status in ('new', 'approved', 'dismissed', 'added')),
  data jsonb not null default '{}'::jsonb,
  first_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists seo_keywords_status_idx on public.seo_keywords (status, impressions desc);
alter table public.seo_keywords enable row level security;
create policy "Owner reads keywords" on public.seo_keywords for select to authenticated using ((select public.is_owner()));

-- ---------- Fix queue ----------
-- auto: safe, applied by the scheduled session without approval. waiting: risky, needs "Approve".
-- queued: approved by the owner, applied by the next session. done / failed / dismissed.
create table if not exists public.seo_fixes (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  type text not null,
  risk text not null check (risk in ('safe', 'risky')),
  page text,
  title text not null,
  change text not null,
  reason text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null check (status in ('auto', 'waiting', 'queued', 'done', 'failed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  done_at timestamptz,
  commit text,
  note text,
  attempts integer not null default 0,
  baseline jsonb,
  after jsonb
);
create index if not exists seo_fixes_status_idx on public.seo_fixes (status, created_at desc);
create index if not exists seo_fixes_page_idx on public.seo_fixes (page, done_at);
alter table public.seo_fixes enable row level security;
create policy "Owner reads fixes" on public.seo_fixes for select to authenticated using ((select public.is_owner()));

-- ---------- Job state (one row) ----------
create table if not exists public.seo_state (
  id integer primary key default 1 check (id = 1),
  gsc_synced_at timestamptz,
  gsc_backfill_before date,
  gsc_backfill_done boolean not null default false,
  sitemaps_synced_at timestamptz,
  bing_synced_at timestamptz,
  cwv_synced_at timestamptz,
  crawl_list_at timestamptz,
  analysed_at timestamptz,
  weekly_sent_on date,
  last_run_at timestamptz,
  last_run jsonb
);
insert into public.seo_state (id) values (1) on conflict do nothing;
alter table public.seo_state enable row level security;
create policy "Owner reads seo state" on public.seo_state for select to authenticated using ((select public.is_owner()));

-- =====================================================================
-- Background job functions (server secret)
-- =====================================================================

create or replace function public.app_seo_state(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return (select to_jsonb(s) from public.seo_state s where id = 1);
end;
$$;

create or replace function public.app_seo_set_state(p_secret text, p_patch jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  update public.seo_state s set
    gsc_synced_at = case when p_patch ? 'gsc_synced_at' then (p_patch ->> 'gsc_synced_at')::timestamptz else s.gsc_synced_at end,
    gsc_backfill_before = case when p_patch ? 'gsc_backfill_before' then (p_patch ->> 'gsc_backfill_before')::date else s.gsc_backfill_before end,
    gsc_backfill_done = case when p_patch ? 'gsc_backfill_done' then (p_patch ->> 'gsc_backfill_done')::boolean else s.gsc_backfill_done end,
    sitemaps_synced_at = case when p_patch ? 'sitemaps_synced_at' then (p_patch ->> 'sitemaps_synced_at')::timestamptz else s.sitemaps_synced_at end,
    bing_synced_at = case when p_patch ? 'bing_synced_at' then (p_patch ->> 'bing_synced_at')::timestamptz else s.bing_synced_at end,
    cwv_synced_at = case when p_patch ? 'cwv_synced_at' then (p_patch ->> 'cwv_synced_at')::timestamptz else s.cwv_synced_at end,
    crawl_list_at = case when p_patch ? 'crawl_list_at' then (p_patch ->> 'crawl_list_at')::timestamptz else s.crawl_list_at end,
    analysed_at = case when p_patch ? 'analysed_at' then (p_patch ->> 'analysed_at')::timestamptz else s.analysed_at end,
    weekly_sent_on = case when p_patch ? 'weekly_sent_on' then (p_patch ->> 'weekly_sent_on')::date else s.weekly_sent_on end,
    last_run_at = case when p_patch ? 'last_run_at' then (p_patch ->> 'last_run_at')::timestamptz else s.last_run_at end,
    last_run = case when p_patch ? 'last_run' then p_patch -> 'last_run' else s.last_run end
  where id = 1;
end;
$$;

-- Bulk upsert of search rows: [{engine, day, page, query, clicks, impressions, position}].
create or replace function public.app_seo_upsert_search(p_secret text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  perform private.check_secret(p_secret);
  insert into public.seo_search (engine, day, page, query, clicks, impressions, position)
  select r.engine, r.day, coalesce(r.page, ''), left(coalesce(r.query, ''), 300), coalesce(r.clicks, 0), coalesce(r.impressions, 0), r.position
  from jsonb_to_recordset(p_rows) as r (engine text, day date, page text, query text, clicks integer, impressions integer, position real)
  on conflict (engine, day, page, query) do update
    set clicks = excluded.clicks, impressions = excluded.impressions, position = excluded.position;
  get diagnostics v = row_count;
  return v;
end;
$$;

-- The sitemap's paths: new ones are added, ones no longer listed are kept but flagged.
create or replace function public.app_seo_set_sitemap_paths(p_secret text, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  insert into public.seo_pages (path, template, in_sitemap)
  select r.path, r.template, true from jsonb_to_recordset(p_rows) as r (path text, template text)
  on conflict (path) do update set template = excluded.template, in_sitemap = true;
  update public.seo_pages set in_sitemap = false
  where in_sitemap and path not in (select r.path from jsonb_to_recordset(p_rows) as r (path text));
end;
$$;

-- Paths to crawl or inspect next, oldest first. p_kind: crawl | inspect.
create or replace function public.app_seo_pages_due(p_secret text, p_kind text, p_older_than_hours integer, p_limit integer)
returns setof text language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  if p_kind = 'crawl' then
    return query select path from public.seo_pages
      where in_sitemap and (crawled_at is null or crawled_at < now() - make_interval(hours => p_older_than_hours))
      order by crawled_at nulls first limit p_limit;
  else
    return query select path from public.seo_pages
      where in_sitemap and (inspected_at is null or inspected_at < now() - make_interval(hours => p_older_than_hours))
      order by inspected_at nulls first limit p_limit;
  end if;
end;
$$;

create or replace function public.app_seo_save_crawl(p_secret text, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  update public.seo_pages p set
    crawled_at = now(), status = r.status, redirect_to = r.redirect_to, response_ms = r.response_ms,
    title = r.title, description = r.description, canonical = r.canonical, has_og = r.has_og,
    has_jsonld = r.has_jsonld, noindex = r.noindex, h1_count = r.h1_count, words = r.words,
    images_missing_alt = r.images_missing_alt,
    links_out = coalesce(r.links_out, '{}'), external_links = coalesce(r.external_links, '{}')
  from jsonb_to_recordset(p_rows) as r (
    path text, status integer, redirect_to text, response_ms integer, title text, description text,
    canonical text, has_og boolean, has_jsonld boolean, noindex boolean, h1_count integer, words integer,
    images_missing_alt integer, links_out text[], external_links text[])
  where p.path = r.path;
end;
$$;

create or replace function public.app_seo_save_inspection(p_secret text, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  update public.seo_pages p set
    inspected_at = now(), index_verdict = r.verdict, coverage_state = r.coverage_state, robots_state = r.robots_state,
    indexing_state = r.indexing_state, page_fetch_state = r.page_fetch_state, google_canonical = r.google_canonical,
    last_google_crawl = r.last_crawl
  from jsonb_to_recordset(p_rows) as r (path text, verdict text, coverage_state text, robots_state text, indexing_state text,
    page_fetch_state text, google_canonical text, last_crawl timestamptz)
  where p.path = r.path;
end;
$$;

-- Every page row (for the analysis; a few hundred rows at most).
create or replace function public.app_seo_all_pages(p_secret text)
returns setof public.seo_pages language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return query select * from public.seo_pages order by path;
end;
$$;

-- Outside links: register where each was found; return the ones due for a check.
create or replace function public.app_seo_register_links(p_secret text, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  insert into public.seo_links (url, found_on)
  select r.url, r.found_on from jsonb_to_recordset(p_rows) as r (url text, found_on text[])
  on conflict (url) do update set found_on = excluded.found_on;
  delete from public.seo_links where url not in (select r.url from jsonb_to_recordset(p_rows) as r (url text));
end;
$$;

create or replace function public.app_seo_links_due(p_secret text, p_limit integer)
returns setof text language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return query select url from public.seo_links where checked_at is null or checked_at < now() - interval '7 days'
    order by checked_at nulls first limit p_limit;
end;
$$;

create or replace function public.app_seo_save_links(p_secret text, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  update public.seo_links l set status = r.status, error = r.error, checked_at = now()
  from jsonb_to_recordset(p_rows) as r (url text, status integer, error text) where l.url = r.url;
end;
$$;

create or replace function public.app_seo_all_links(p_secret text)
returns setof public.seo_links language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return query select * from public.seo_links;
end;
$$;

create or replace function public.app_seo_save_cwv(p_secret text, p_row jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  insert into public.seo_cwv (template, day, url, performance, lab_lcp_ms, lab_cls, lab_tbt_ms, field_lcp_ms, field_inp_ms, field_cls, field_category, field_source)
  select r.template, (now() at time zone 'Asia/Karachi')::date, r.url, r.performance, r.lab_lcp_ms, r.lab_cls, r.lab_tbt_ms,
         r.field_lcp_ms, r.field_inp_ms, r.field_cls, r.field_category, r.field_source
  from jsonb_to_record(p_row) as r (template text, url text, performance integer, lab_lcp_ms integer, lab_cls real, lab_tbt_ms integer,
    field_lcp_ms integer, field_inp_ms integer, field_cls real, field_category text, field_source text)
  on conflict (template, day) do update set url = excluded.url, performance = excluded.performance, lab_lcp_ms = excluded.lab_lcp_ms,
    lab_cls = excluded.lab_cls, lab_tbt_ms = excluded.lab_tbt_ms, field_lcp_ms = excluded.field_lcp_ms, field_inp_ms = excluded.field_inp_ms,
    field_cls = excluded.field_cls, field_category = excluded.field_category, field_source = excluded.field_source;
end;
$$;

-- Templates whose Core Web Vitals were not measured today.
create or replace function public.app_seo_cwv_measured_today(p_secret text)
returns setof text language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return query select template from public.seo_cwv where day = (now() at time zone 'Asia/Karachi')::date;
end;
$$;

create or replace function public.app_seo_cwv_latest(p_secret text)
returns setof public.seo_cwv language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return query select distinct on (template) * from public.seo_cwv order by template, day desc;
end;
$$;

create or replace function public.app_seo_save_sitemaps(p_secret text, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  insert into public.seo_sitemaps (path, last_submitted, last_downloaded, is_pending, errors, warnings, submitted, indexed, synced_at)
  select r.path, r.last_submitted, r.last_downloaded, r.is_pending, r.errors, r.warnings, r.submitted, r.indexed, now()
  from jsonb_to_recordset(p_rows) as r (path text, last_submitted timestamptz, last_downloaded timestamptz, is_pending boolean,
    errors integer, warnings integer, submitted integer, indexed integer)
  on conflict (path) do update set last_submitted = excluded.last_submitted, last_downloaded = excluded.last_downloaded,
    is_pending = excluded.is_pending, errors = excluded.errors, warnings = excluded.warnings, submitted = excluded.submitted,
    indexed = excluded.indexed, synced_at = now();
end;
$$;

-- Aggregated search rows for a date range. p_kind: total | page | query | pair.
-- Position is impression-weighted across days.
create or replace function public.app_seo_agg(p_secret text, p_engine text, p_kind text, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  perform private.check_secret(p_secret);
  select coalesce(jsonb_agg(jsonb_build_object('page', page, 'query', query, 'clicks', clicks, 'impressions', impressions, 'position', position)), '[]'::jsonb)
  into v
  from (
    select page, query, sum(clicks)::integer as clicks, sum(impressions)::integer as impressions,
           round((sum(position * impressions) / nullif(sum(impressions), 0))::numeric, 1) as position
    from public.seo_search
    where engine = p_engine and day between p_from and p_to
      and case p_kind
            when 'total' then page = '' and query = ''
            when 'page' then page <> '' and query = ''
            when 'query' then page = '' and query <> ''
            else page <> '' and query <> '' end
    group by page, query
  ) a;
  return v;
end;
$$;

-- Latest day with Google data (Search Console lags 2-3 days).
create or replace function public.app_seo_latest_day(p_secret text, p_engine text)
returns date language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return (select max(day) from public.seo_search where engine = p_engine and page = '' and query = '');
end;
$$;

create or replace function public.app_seo_replace_opportunities(p_secret text, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  delete from public.seo_opportunities where true;
  insert into public.seo_opportunities (kind, query, page, score, data, fix_key)
  select r.kind, r.query, r.page, coalesce(r.score, 0), coalesce(r.data, '{}'::jsonb), r.fix_key
  from jsonb_to_recordset(p_rows) as r (kind text, query text, page text, score real, data jsonb, fix_key text);
end;
$$;

-- Current issues: upsert the given ones, resolve every open issue that is no longer found.
create or replace function public.app_seo_replace_issues(p_secret text, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  insert into public.seo_issues (path, type, severity, detail, fix_key, last_seen, resolved_at)
  select r.path, r.type, r.severity, r.detail, r.fix_key, now(), null
  from jsonb_to_recordset(p_rows) as r (path text, type text, severity text, detail text, fix_key text)
  on conflict (path, type) do update set severity = excluded.severity, detail = excluded.detail, fix_key = excluded.fix_key,
    last_seen = now(), resolved_at = null,
    first_seen = case when public.seo_issues.resolved_at is not null then now() else public.seo_issues.first_seen end;
  update public.seo_issues i set resolved_at = now()
  where i.resolved_at is null
    and not exists (select 1 from jsonb_to_recordset(p_rows) as r (path text, type text) where r.path = i.path and r.type = i.type);
end;
$$;

-- Keyword ideas: new ones are added; numbers refresh; the owner's decision (status) is kept.
create or replace function public.app_seo_upsert_keywords(p_secret text, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  insert into public.seo_keywords (keyword, sources, intent, cluster, impressions, clicks, position, page, has_page, data, updated_at)
  select r.keyword, r.sources, r.intent, r.cluster, coalesce(r.impressions, 0), coalesce(r.clicks, 0), r.position, r.page,
         coalesce(r.has_page, false), coalesce(r.data, '{}'::jsonb), now()
  from jsonb_to_recordset(p_rows) as r (keyword text, sources text[], intent text, cluster text, impressions integer, clicks integer,
    position real, page text, has_page boolean, data jsonb)
  on conflict (keyword) do update set sources = excluded.sources, intent = excluded.intent, cluster = excluded.cluster,
    impressions = excluded.impressions, clicks = excluded.clicks, position = excluded.position, page = excluded.page,
    has_page = excluded.has_page, data = excluded.data, updated_at = now();
end;
$$;

-- New fixes. A key that already exists is left alone (its status and history stay).
create or replace function public.app_seo_add_fixes(p_secret text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  perform private.check_secret(p_secret);
  insert into public.seo_fixes (key, type, risk, page, title, change, reason, data, status)
  select r.key, r.type, r.risk, r.page, left(r.title, 200), r.change, r.reason, coalesce(r.data, '{}'::jsonb),
         case when r.risk = 'safe' then 'auto' else 'waiting' end
  from jsonb_to_recordset(p_rows) as r (key text, type text, risk text, page text, title text, change text, reason text, data jsonb)
  on conflict (key) do nothing;
  get diagnostics v = row_count;
  return v;
end;
$$;

-- Page clicks, impressions and impression-weighted position for a date range (Google).
create or replace function private.seo_page_window(p_page text, p_from date, p_to date)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0),
    'position', round((sum(position * impressions) / nullif(sum(impressions), 0))::numeric, 1))
  from public.seo_search
  where engine = 'google' and page = p_page and query = '' and day between p_from and p_to
$$;

-- The queue for the scheduled session: safe fixes (auto) and approved ones (queued), skipping a
-- page that already had a fix done in the last 28 days (so each change can be measured alone).
create or replace function public.app_seo_fix_queue(p_secret text, p_limit integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return coalesce((
    select jsonb_agg(to_jsonb(f) order by f.status desc, f.created_at)
    from (
      select id, key, type, risk, page, title, change, reason, data, status, created_at, attempts
      from public.seo_fixes q
      where q.status in ('auto', 'queued')
        and (q.page is null or not exists (
          select 1 from public.seo_fixes d where d.page = q.page and d.status = 'done' and d.done_at > now() - interval '28 days'))
      order by q.status desc, q.created_at
      limit greatest(1, least(p_limit, 50))
    ) f), '[]'::jsonb);
end;
$$;

-- Marks a fix done (with the commit) or failed. Done: stores the page's last 28 days as the baseline.
create or replace function public.app_seo_fix_mark(p_secret text, p_id uuid, p_status text, p_commit text, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_latest date;
  v_fix public.seo_fixes;
begin
  perform private.check_secret(p_secret);
  if p_status not in ('done', 'failed') then raise exception 'status must be done or failed'; end if;
  select * into v_fix from public.seo_fixes where id = p_id;
  if v_fix.id is null then raise exception 'fix not found'; end if;
  if v_fix.status not in ('auto', 'queued', 'failed') then raise exception 'fix is %', v_fix.status; end if;
  select max(day) into v_latest from public.seo_search where engine = 'google' and page = '' and query = '';
  update public.seo_fixes set
    status = case when p_status = 'failed' and attempts + 1 < 3 then status else p_status end,
    attempts = attempts + case when p_status = 'failed' then 1 else 0 end,
    commit = case when p_status = 'done' then left(p_commit, 64) else commit end,
    note = left(p_note, 2000),
    done_at = case when p_status = 'done' then now() else done_at end,
    baseline = case when p_status = 'done' and v_fix.page is not null and v_latest is not null
      then private.seo_page_window(v_fix.page, v_latest - 27, v_latest) else baseline end,
    updated_at = now()
  where id = p_id;
  return (select to_jsonb(f) from public.seo_fixes f where id = p_id);
end;
$$;

-- Before -> after: the 28 days after a fix (or as many as there are so far).
create or replace function public.app_seo_track_fixes(p_secret text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_latest date;
  v integer;
begin
  perform private.check_secret(p_secret);
  select max(day) into v_latest from public.seo_search where engine = 'google' and page = '' and query = '';
  if v_latest is null then return 0; end if;
  update public.seo_fixes f set
    after = private.seo_page_window(f.page, (f.done_at at time zone 'Asia/Karachi')::date + 1,
                                    least(v_latest, (f.done_at at time zone 'Asia/Karachi')::date + 28))
            || jsonb_build_object('complete', v_latest >= (f.done_at at time zone 'Asia/Karachi')::date + 28),
    updated_at = now()
  where f.status = 'done' and f.page is not null and f.done_at is not null
    and (f.after is null or not coalesce((f.after ->> 'complete')::boolean, false))
    and v_latest > (f.done_at at time zone 'Asia/Karachi')::date;
  get diagnostics v = row_count;
  return v;
end;
$$;

-- Weekly email: last 7 days with data vs the 7 before, top queries gained/lost, fixes, ideas.
create or replace function public.app_seo_weekly(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_end date;
  v jsonb;
begin
  perform private.check_secret(p_secret);
  select max(day) into v_end from public.seo_search where engine = 'google' and page = '' and query = '';
  with q as (
    select query,
      sum(clicks) filter (where day > v_end - 7) as cur_clicks,
      sum(clicks) filter (where day <= v_end - 7) as prev_clicks,
      sum(impressions) filter (where day > v_end - 7) as cur_impr,
      sum(impressions) filter (where day <= v_end - 7) as prev_impr
    from public.seo_search
    where engine = 'google' and page = '' and query <> '' and day > v_end - 14 and day <= v_end
    group by query
  ), d as (
    select query, coalesce(cur_clicks, 0) - coalesce(prev_clicks, 0) as dc, coalesce(cur_impr, 0) - coalesce(prev_impr, 0) as di,
           coalesce(cur_clicks, 0) as cur_clicks, coalesce(cur_impr, 0) as cur_impr from q
  )
  select jsonb_build_object(
    'end', v_end,
    'cur', (select jsonb_build_object('clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0)) from public.seo_search
            where engine = 'google' and page = '' and query = '' and day > v_end - 7 and day <= v_end),
    'prev', (select jsonb_build_object('clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0)) from public.seo_search
            where engine = 'google' and page = '' and query = '' and day > v_end - 14 and day <= v_end - 7),
    'gained', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from d where dc > 0 or (dc = 0 and di > 0) order by dc desc, di desc limit 5) x), '[]'::jsonb),
    'lost', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from d where dc < 0 or (dc = 0 and di < 0) order by dc, di limit 5) x), '[]'::jsonb),
    'done', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'page', page, 'commit', commit) order by done_at desc)
            from public.seo_fixes where status = 'done' and done_at > now() - interval '7 days'), '[]'::jsonb),
    'waiting', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'page', page) order by created_at)
            from public.seo_fixes where status = 'waiting'), '[]'::jsonb),
    'auto_queued', (select count(*) from public.seo_fixes where status in ('auto', 'queued')),
    'ideas', coalesce((select jsonb_agg(jsonb_build_object('keyword', keyword, 'impressions', impressions, 'cluster', cluster) order by impressions desc)
            from (select * from public.seo_keywords where status = 'new' and first_seen > now() - interval '7 days' order by impressions desc limit 10) k), '[]'::jsonb),
    'open_issues', (select count(*) from public.seo_issues where resolved_at is null and severity = 'error')
  ) into v;
  return v;
end;
$$;

-- Monthly report data (scripts/autopilot/monthly.mjs).
create or replace function public.app_seo_monthly(p_secret text, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return jsonb_build_object(
    'google', (select jsonb_build_object('clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0),
               'days', count(*)) from public.seo_search where engine = 'google' and page = '' and query = '' and day >= p_from and day < p_to),
    'google_prev', (select jsonb_build_object('clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0),
               'days', count(*)) from public.seo_search where engine = 'google' and page = '' and query = ''
               and day >= p_from - (p_to - p_from) and day < p_from),
    'bing', (select jsonb_build_object('clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0))
               from public.seo_search where engine = 'bing' and page = '' and query <> '' and day >= p_from and day < p_to),
    'index', coalesce((select jsonb_object_agg(coalesce(coverage_state, 'Not inspected yet'), n) from (
               select coverage_state, count(*) as n from public.seo_pages where in_sitemap group by 1) s), '{}'::jsonb),
    'issues_open', coalesce((select jsonb_object_agg(severity, n) from (
               select severity, count(*) as n from public.seo_issues where resolved_at is null group by 1) s), '{}'::jsonb),
    'issues_resolved', (select count(*) from public.seo_issues where resolved_at >= p_from and resolved_at < p_to),
    'fixes_done', coalesce((select jsonb_agg(jsonb_build_object('type', type, 'title', title, 'page', page, 'commit', commit,
               'done_at', done_at, 'baseline', baseline, 'after', after) order by done_at)
               from public.seo_fixes where status = 'done' and done_at >= p_from and done_at < p_to), '[]'::jsonb),
    'fixes_waiting', (select count(*) from public.seo_fixes where status = 'waiting'),
    'fixes_measured', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'page', page, 'baseline', baseline, 'after', after))
               from public.seo_fixes where status = 'done' and coalesce((after ->> 'complete')::boolean, false)
               and done_at >= p_from - interval '28 days' and done_at < p_to), '[]'::jsonb),
    'keywords_new', (select count(*) from public.seo_keywords where first_seen >= p_from and first_seen < p_to),
    'cwv', coalesce((select jsonb_agg(to_jsonb(c)) from (select distinct on (template) * from public.seo_cwv
               where day < p_to order by template, day desc) c), '[]'::jsonb)
  );
end;
$$;

-- =====================================================================
-- /admin/seo (called after the owner check, with the server secret)
-- =====================================================================

-- Owner decisions on a fix: approve (waiting -> queued), dismiss, or retry a failed one.
create or replace function public.app_seo_fix_decide(p_secret text, p_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  if p_decision = 'approve' then
    update public.seo_fixes set status = 'queued', approved_at = now(), updated_at = now() where id = p_id and status = 'waiting';
  elsif p_decision = 'dismiss' then
    update public.seo_fixes set status = 'dismissed', updated_at = now() where id = p_id and status in ('auto', 'waiting', 'queued', 'failed');
  elsif p_decision = 'retry' then
    update public.seo_fixes set status = case when risk = 'safe' then 'auto' else 'queued' end, attempts = 0, updated_at = now()
    where id = p_id and status = 'failed';
  else
    raise exception 'unknown decision';
  end if;
end;
$$;

-- Owner decisions on a keyword idea. Approve adds a safe "backlog-add" fix for the autopilot.
create or replace function public.app_seo_keyword_decide(p_secret text, p_keyword text, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare k public.seo_keywords;
begin
  perform private.check_secret(p_secret);
  select * into k from public.seo_keywords where keyword = p_keyword;
  if k.keyword is null then raise exception 'keyword not found'; end if;
  if p_decision = 'dismiss' then
    update public.seo_keywords set status = 'dismissed', updated_at = now() where keyword = p_keyword;
  elsif p_decision = 'approve' then
    update public.seo_keywords set status = 'approved', updated_at = now() where keyword = p_keyword;
    insert into public.seo_fixes (key, type, risk, page, title, change, reason, data, status)
    values (
      'backlog-add:' || k.keyword, 'backlog-add', 'safe', null,
      'Add "' || k.keyword || '" to the blog backlog',
      'Add a supporting topic for "' || k.keyword || '" to content/backlog.json' || coalesce(' in cluster ' || k.cluster, '') ||
        ' (intent ' || coalesce(k.intent, 'learn') || '), with secondary keywords, questions, reader and angle. Never publish it directly: the blog autopilot writes it at its pace.',
      'Approved keyword idea. Sources: ' || array_to_string(k.sources, ', ') ||
        case when k.impressions > 0 then '. Google: ' || k.impressions || ' impressions, ' || k.clicks || ' clicks' ||
          coalesce(', average position ' || k.position, '') || ' in the last 28 days.' else '.' end,
      jsonb_build_object('keyword', k.keyword, 'cluster', k.cluster, 'intent', k.intent, 'idea', k.data),
      'auto')
    on conflict (key) do nothing;
  else
    raise exception 'unknown decision';
  end if;
end;
$$;

-- Overview: Google totals (last 28 days with data vs the 28 before), daily series (90 days),
-- health inputs, index coverage, issue and fix counts, CWV, sitemaps and job state.
create or replace function public.app_admin_seo_overview(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_end date;
  v jsonb;
begin
  perform private.check_secret(p_secret);
  select max(day) into v_end from public.seo_search where engine = 'google' and page = '' and query = '';
  with t as (
    select day, clicks, impressions, position from public.seo_search
    where engine = 'google' and page = '' and query = '' and v_end is not null and day > v_end - 56 and day <= v_end
  ), page_score as (
    select p.path,
      greatest(0, 100 - 25 * count(*) filter (where i.severity = 'error') - 8 * count(*) filter (where i.severity = 'warning')
                      - 2 * count(*) filter (where i.severity = 'notice')) as score
    from public.seo_pages p
    left join public.seo_issues i on i.path = p.path and i.resolved_at is null
    where p.in_sitemap and p.crawled_at is not null
    group by p.path
  )
  select jsonb_build_object(
    'end', v_end,
    'first_day', (select min(day) from public.seo_search where engine = 'google'),
    'cur', (select jsonb_build_object('clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0),
             'position', round((sum(position * impressions) / nullif(sum(impressions), 0))::numeric, 1)) from t where day > v_end - 28),
    'prev', (select jsonb_build_object('clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0),
             'position', round((sum(position * impressions) / nullif(sum(impressions), 0))::numeric, 1)) from t where day <= v_end - 28),
    'series', coalesce((select jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'clicks', clicks, 'impressions', impressions) order by day)
             from public.seo_search where engine = 'google' and page = '' and query = '' and v_end is not null and day > v_end - 90), '[]'::jsonb),
    'bing', (select jsonb_build_object('clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0), 'rows', count(*))
             from public.seo_search where engine = 'bing' and page = '' and query <> '' and day > (now() at time zone 'Asia/Karachi')::date - 28),
    'health', (select round(avg(score)) from page_score),
    'pages', (select count(*) from public.seo_pages where in_sitemap),
    'crawled', (select count(*) from public.seo_pages where in_sitemap and crawled_at is not null),
    'inspected', (select count(*) from public.seo_pages where in_sitemap and inspected_at is not null),
    'index', coalesce((select jsonb_object_agg(state, n) from (
             select coalesce(coverage_state, 'Not inspected yet') as state, count(*) as n from public.seo_pages where in_sitemap group by 1) s), '{}'::jsonb),
    'issues', coalesce((select jsonb_object_agg(severity, n) from (
             select severity, count(*) as n from public.seo_issues where resolved_at is null group by 1) s), '{}'::jsonb),
    'fixes', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) as n from public.seo_fixes group by 1) s), '{}'::jsonb),
    'opportunities', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) as n from public.seo_opportunities group by 1) s), '{}'::jsonb),
    'keywords_new', (select count(*) from public.seo_keywords where status = 'new'),
    'cwv', coalesce((select jsonb_agg(to_jsonb(c) order by c.template) from (
             select distinct on (template) * from public.seo_cwv order by template, day desc) c), '[]'::jsonb),
    'sitemaps', coalesce((select jsonb_agg(to_jsonb(s)) from public.seo_sitemaps s), '[]'::jsonb),
    'state', (select to_jsonb(s) from public.seo_state s where id = 1)
  ) into v;
  return v;
end;
$$;

-- Pages list: every sitemap URL with its last 28 days (Google), index status and open issues.
create or replace function public.app_admin_seo_pages(p_secret text, p_offset integer, p_limit integer, p_search text, p_sort text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_end date;
  v jsonb;
begin
  perform private.check_secret(p_secret);
  select max(day) into v_end from public.seo_search where engine = 'google' and page = '' and query = '';
  with s as (
    select page, sum(clicks) as clicks, sum(impressions) as impressions,
           round((sum(position * impressions) / nullif(sum(impressions), 0))::numeric, 1) as position
    from public.seo_search where engine = 'google' and page <> '' and query = '' and day > v_end - 28 and day <= v_end
    group by page
  ), rows as (
    select p.path, p.template, p.status, p.coverage_state, p.index_verdict, p.crawled_at, p.inspected_at, p.title, p.response_ms,
           coalesce(s.clicks, 0) as clicks, coalesce(s.impressions, 0) as impressions, s.position,
           (select count(*) from public.seo_issues i where i.path = p.path and i.resolved_at is null) as issues,
           (select count(*) from public.seo_issues i where i.path = p.path and i.resolved_at is null and i.severity = 'error') as errors
    from public.seo_pages p
    left join s on s.page = p.path
    where p.in_sitemap and (coalesce(p_search, '') = '' or p.path ilike '%' || p_search || '%' or p.title ilike '%' || p_search || '%')
  )
  select jsonb_build_object(
    'total', (select count(*) from rows),
    'rows', coalesce((select jsonb_agg(to_jsonb(r)) from (
      select * from rows order by
        case when p_sort = 'issues' then errors * 100 + issues end desc nulls last,
        case when p_sort = 'position' then position end asc nulls last,
        case when p_sort = 'path' then path end asc,
        clicks desc, impressions desc, path
      offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 100)) r), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

-- Queries list: every Google query of the last 28 days with its top page and the trend vs the 28 before.
create or replace function public.app_admin_seo_queries(p_secret text, p_offset integer, p_limit integer, p_search text, p_sort text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_end date;
  v jsonb;
begin
  perform private.check_secret(p_secret);
  select max(day) into v_end from public.seo_search where engine = 'google' and page = '' and query = '';
  with cur as (
    select query, sum(clicks) as clicks, sum(impressions) as impressions,
           round((sum(position * impressions) / nullif(sum(impressions), 0))::numeric, 1) as position
    from public.seo_search where engine = 'google' and page = '' and query <> '' and day > v_end - 28 and day <= v_end
    group by query
  ), prev as (
    select query, sum(clicks) as clicks, round((sum(position * impressions) / nullif(sum(impressions), 0))::numeric, 1) as position
    from public.seo_search where engine = 'google' and page = '' and query <> '' and day > v_end - 56 and day <= v_end - 28
    group by query
  ), top_page as (
    select distinct on (query) query, page from (
      select query, page, sum(impressions) as n from public.seo_search
      where engine = 'google' and page <> '' and query <> '' and day > v_end - 28 and day <= v_end group by query, page) x
    order by query, n desc
  ), rows as (
    select c.query, c.clicks, c.impressions, c.position,
           round(c.clicks::numeric / nullif(c.impressions, 0) * 100, 1) as ctr,
           p.position as prev_position, coalesce(p.clicks, 0) as prev_clicks, t.page
    from cur c left join prev p using (query) left join top_page t using (query)
    where coalesce(p_search, '') = '' or c.query ilike '%' || p_search || '%'
  )
  select jsonb_build_object(
    'total', (select count(*) from rows),
    'rows', coalesce((select jsonb_agg(to_jsonb(r)) from (
      select * from rows order by
        case when p_sort = 'position' then position end asc nulls last,
        case when p_sort = 'clicks' then clicks end desc,
        impressions desc, clicks desc, query
      offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 100)) r), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

-- ---------- Scheduler: pg_cron calls /api/seo/sync every hour (each step runs only when due) ----------
-- Uses the same Vault secret as the outreach tick (CRON_SECRET, stored by scripts/outreach-setup.ts).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'seo-sync') then
    perform cron.unschedule('seo-sync');
  end if;
end;
$$;
select cron.schedule(
  'seo-sync',
  '17 * * * *',
  $job$
  select net.http_get(
    url := 'https://hamzatariq.site/api/seo/sync',
    headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
    timeout_milliseconds := 60000
  )
  from vault.decrypted_secrets s
  where s.name = 'outreach_cron_secret';
  $job$
);
