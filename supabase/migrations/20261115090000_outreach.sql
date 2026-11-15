-- Outreach (owner only): saved OpenStreetMap searches, prospects with their audits, the email
-- sequence, a permanent suppression list, settings and an OSM response cache.
-- The owner reads and edits through Supabase Auth + RLS (/admin/prospects). Background jobs
-- (Vercel Cron, GitHub Actions tick) write through the SECURITY DEFINER app_ox_* functions,
-- which check SUPABASE_SERVER_SECRET like every other app_* function.

-- ---------- Tables ----------

create table public.outreach_settings (
  id integer primary key default 1 check (id = 1),
  paused boolean not null default false,
  pause_reason text check (char_length(pause_reason) <= 300),
  approve_first boolean not null default true,
  -- First real send: week 1 = 15/day, week 2 = 20/day, then 30/day.
  started_at timestamptz,
  next_send_at timestamptz,
  last_imap_at timestamptz,
  last_imap_uid bigint,
  updated_at timestamptz not null default now()
);
insert into public.outreach_settings (id) values (1);

create table public.outreach_searches (
  id uuid primary key default gen_random_uuid(),
  business_type text not null check (char_length(business_type) <= 40),
  city text not null check (char_length(city) between 1 and 80),
  country text not null check (country in ('US', 'GB', 'AE', 'CA', 'AU')),
  active boolean not null default true,
  lat double precision,
  lon double precision,
  osm_area bigint,
  timezone text check (char_length(timezone) <= 60),
  last_run_at timestamptz,
  last_found integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.outreach_cache (
  key text primary key check (char_length(key) <= 300),
  value jsonb not null,
  created_at timestamptz not null default now()
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references public.outreach_searches (id) on delete set null,
  osm_id text not null unique check (char_length(osm_id) <= 40),
  name text not null check (char_length(name) between 1 and 160),
  business_type text not null check (char_length(business_type) <= 40),
  city text check (char_length(city) <= 80),
  country text not null check (country in ('US', 'GB', 'AE', 'CA', 'AU')),
  timezone text not null check (char_length(timezone) <= 60),
  website text check (char_length(website) <= 500),
  domain text check (char_length(domain) <= 255),
  phone text check (char_length(phone) <= 60),
  email text check (char_length(email) <= 254),
  email_source text check (email_source in ('osm', 'contact-page')),
  osm_tags jsonb not null default '{}'::jsonb,
  status text not null default 'found' check (status in
    ('found', 'audited', 'skipped', 'emailed', 'replied', 'call', 'won', 'lost', 'unsubscribed', 'bounced')),
  skip_reason text check (char_length(skip_reason) <= 200),
  audit_score integer check (audit_score between 0 and 100),
  lead_score integer check (lead_score between 0 and 100),
  notes text check (char_length(notes) <= 4000),
  lead_id uuid references public.leads (id) on delete set null,
  unsubscribe_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prospects_status_idx on public.prospects (status, created_at);
create index prospects_domain_idx on public.prospects (lower(domain));
create index prospects_email_idx on public.prospects (lower(email));

create table public.prospect_audits (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  -- Public, unguessable id of the /report/<id> page (expires after 30 days).
  report_id text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  url text not null check (char_length(url) <= 500),
  final_url text check (char_length(final_url) <= 500),
  score integer check (score between 0 and 100),
  result jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index prospect_audits_prospect_idx on public.prospect_audits (prospect_id, created_at desc);

create table public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  direction text not null default 'out' check (direction in ('out', 'in')),
  -- out: 0 first email, 1 and 2 follow-ups. in: null.
  step integer check (step between 0 and 2),
  kind text not null default 'email' check (kind in ('email', 'reply', 'bounce', 'unsubscribe', 'complaint', 'auto-reply', 'test')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'failed', 'cancelled', 'received')),
  subject text not null check (char_length(subject) <= 200),
  body text not null check (char_length(body) <= 8000),
  message_id text check (char_length(message_id) <= 300),
  in_reply_to text check (char_length(in_reply_to) <= 300),
  error text check (char_length(error) <= 500),
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index outreach_messages_status_idx on public.outreach_messages (status, created_at);
create index outreach_messages_prospect_idx on public.outreach_messages (prospect_id, created_at);
create index outreach_messages_msgid_idx on public.outreach_messages (message_id);

-- Permanent: nothing (owner or server) can delete from it.
create table public.suppression_list (
  email text primary key check (char_length(email) <= 254 and email = lower(email)),
  reason text not null check (reason in ('unsubscribed', 'bounced', 'complaint', 'replied', 'manual')),
  prospect_id uuid references public.prospects (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.outreach_settings enable row level security;
alter table public.outreach_searches enable row level security;
alter table public.outreach_cache enable row level security;
alter table public.prospects enable row level security;
alter table public.prospect_audits enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.suppression_list enable row level security;

-- ---------- Owner access ----------

create policy "Owner reads outreach settings" on public.outreach_settings for select to authenticated using ((select public.is_owner()));
create policy "Owner updates outreach settings" on public.outreach_settings for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "Owner manages searches" on public.outreach_searches for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "Owner reads prospects" on public.prospects for select to authenticated using ((select public.is_owner()));
create policy "Owner updates prospects" on public.prospects for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "Owner reads prospect audits" on public.prospect_audits for select to authenticated using ((select public.is_owner()));
create policy "Owner reads outreach messages" on public.outreach_messages for select to authenticated using ((select public.is_owner()));
create policy "Owner updates outreach messages" on public.outreach_messages for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "Owner reads suppression list" on public.suppression_list for select to authenticated using ((select public.is_owner()));
create policy "Owner adds to suppression list" on public.suppression_list for insert to authenticated with check ((select public.is_owner()));

-- Column limits for the owner (server functions do the rest).
revoke all on public.outreach_settings, public.outreach_searches, public.outreach_cache, public.prospects,
  public.prospect_audits, public.outreach_messages, public.suppression_list from anon, authenticated;
grant select on public.outreach_settings, public.outreach_searches, public.prospects, public.prospect_audits,
  public.outreach_messages, public.suppression_list to authenticated;
grant update (paused, pause_reason, approve_first, updated_at) on public.outreach_settings to authenticated;
grant insert (business_type, city, country, active), update (active), delete on public.outreach_searches to authenticated;
grant update (status, notes, updated_at) on public.prospects to authenticated;
grant update (status, subject, body, approved_at) on public.outreach_messages to authenticated;
grant insert (email, reason, prospect_id) on public.suppression_list to authenticated;

-- Replies from outreach become leads.
alter table public.leads drop constraint leads_source_check;
alter table public.leads add constraint leads_source_check
  check (source in ('chatbot', 'form', 'tool', 'page', 'seo-audit', 'website-cost-calculator', 'chatbot-roi-calculator', 'outreach'));

-- ---------- Server API (anon key + server secret) ----------

-- Settings, active searches and the sending counters, in one call.
create or replace function public.app_ox_state(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  perform private.check_secret(p_secret);
  select jsonb_build_object(
    'settings', (select to_jsonb(s) from public.outreach_settings s where id = 1),
    'searches', coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at) from public.outreach_searches q where q.active), '[]'::jsonb),
    'sent_24h', (select count(*) from public.outreach_messages where direction = 'out' and kind = 'email' and status = 'sent' and sent_at > now() - interval '24 hours'),
    'sent_7d', (select count(*) from public.outreach_messages where direction = 'out' and kind = 'email' and status = 'sent' and sent_at > now() - interval '7 days'),
    'bounces_7d', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'bounce' and created_at > now() - interval '7 days'),
    'complaints_7d', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'complaint' and created_at > now() - interval '7 days'),
    'found_24h', (select count(*) from public.prospects where created_at > now() - interval '24 hours')
  ) into v;
  return v;
end;
$$;

create or replace function public.app_ox_set(p_secret text, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  update public.outreach_settings set
    paused = case when p_patch ? 'paused' then (p_patch ->> 'paused')::boolean else paused end,
    pause_reason = case when p_patch ? 'pause_reason' then left(p_patch ->> 'pause_reason', 300) else pause_reason end,
    started_at = case when p_patch ? 'started_at' then (p_patch ->> 'started_at')::timestamptz else started_at end,
    next_send_at = case when p_patch ? 'next_send_at' then (p_patch ->> 'next_send_at')::timestamptz else next_send_at end,
    last_imap_at = case when p_patch ? 'last_imap_at' then (p_patch ->> 'last_imap_at')::timestamptz else last_imap_at end,
    last_imap_uid = case when p_patch ? 'last_imap_uid' then (p_patch ->> 'last_imap_uid')::bigint else last_imap_uid end,
    updated_at = now()
  where id = 1;
end;
$$;

create or replace function public.app_ox_search(p_secret text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return (select to_jsonb(q) from public.outreach_searches q where id = p_id);
end;
$$;

create or replace function public.app_ox_search_ran(p_secret text, p_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  update public.outreach_searches set
    lat = coalesce((p_patch ->> 'lat')::double precision, lat),
    lon = coalesce((p_patch ->> 'lon')::double precision, lon),
    osm_area = coalesce((p_patch ->> 'osm_area')::bigint, osm_area),
    timezone = coalesce(left(p_patch ->> 'timezone', 60), timezone),
    last_found = coalesce((p_patch ->> 'last_found')::integer, last_found),
    last_run_at = now()
  where id = p_id;
end;
$$;

create or replace function public.app_ox_cache_get(p_secret text, p_key text, p_hours integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return (select value from public.outreach_cache where key = p_key and created_at > now() - make_interval(hours => p_hours));
end;
$$;

create or replace function public.app_ox_cache_put(p_secret text, p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  insert into public.outreach_cache (key, value) values (left(p_key, 300), p_value)
  on conflict (key) do update set value = excluded.value, created_at = now();
  delete from public.outreach_cache where created_at < now() - interval '14 days';
end;
$$;

-- Adds a business unless it is already known (same OSM id, domain or email) or suppressed.
-- Returns the new id, or null when skipped.
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
  insert into public.prospects (search_id, osm_id, name, business_type, city, country, timezone, website, domain, phone, email, email_source, osm_tags)
  values ((p_row ->> 'search_id')::uuid, p_row ->> 'osm_id', left(p_row ->> 'name', 160), p_row ->> 'business_type', left(p_row ->> 'city', 80),
          p_row ->> 'country', p_row ->> 'timezone', left(p_row ->> 'website', 500), v_domain, left(p_row ->> 'phone', 60),
          v_email, case when v_email is not null then 'osm' end, coalesce(p_row -> 'osm_tags', '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

-- Work lists for the background jobs, as jsonb arrays.
--   to_audit:   new prospects to audit (oldest first)
--   to_draft:   audited prospects without a first email
--   followups:  emailed prospects whose next follow-up is due (4 and 8 days after the first email)
--   approved:   approved emails waiting to be sent, with the prospect's timezone and email
--   sent_ids:   message ids and recipients of emails sent in the last 60 days (for reply matching)
create or replace function public.app_ox_list(p_secret text, p_kind text, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  if p_kind = 'to_audit' then
    return coalesce((select jsonb_agg(to_jsonb(p)) from (select * from public.prospects where status = 'found' order by created_at limit p_limit) p), '[]'::jsonb);
  elsif p_kind = 'to_draft' then
    return coalesce((select jsonb_agg(to_jsonb(p)) from (
      select pr.*, (select to_jsonb(a) from public.prospect_audits a where a.prospect_id = pr.id order by a.created_at desc limit 1) as audit
      from public.prospects pr
      where pr.status = 'audited' and pr.email is not null
        and not exists (select 1 from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.kind = 'email')
        and not exists (select 1 from public.suppression_list s where s.email = lower(pr.email))
      order by pr.lead_score desc nulls last, pr.created_at
      limit p_limit) p), '[]'::jsonb);
  elsif p_kind = 'followups' then
    return coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('prospect', to_jsonb(pr), 'first', to_jsonb(f), 'next_step', n.step,
        'audit', (select to_jsonb(a) from public.prospect_audits a where a.prospect_id = pr.id order by a.created_at desc limit 1)) as x
      from public.prospects pr
      join lateral (select * from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.kind = 'email' and m.step = 0 and m.status = 'sent' limit 1) f on true
      join lateral (select coalesce(max(m.step), 0) + 1 as step from public.outreach_messages m
                    where m.prospect_id = pr.id and m.direction = 'out' and m.kind = 'email' and m.status in ('draft', 'approved', 'sent')) n on true
      where pr.status = 'emailed' and n.step <= 2
        and f.sent_at <= now() - make_interval(days => case n.step when 1 then 4 else 8 end)
        and not exists (select 1 from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'in' and m.kind in ('reply', 'bounce', 'unsubscribe', 'complaint'))
        and not exists (select 1 from public.suppression_list s where s.email = lower(pr.email))
      limit p_limit) t), '[]'::jsonb);
  elsif p_kind = 'approved' then
    return coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('message', to_jsonb(m), 'prospect', to_jsonb(pr),
        'thread', (select jsonb_build_object('message_id', f.message_id, 'subject', f.subject) from public.outreach_messages f
                   where f.prospect_id = pr.id and f.direction = 'out' and f.step = 0 and f.status = 'sent' limit 1)) as x
      from public.outreach_messages m join public.prospects pr on pr.id = m.prospect_id
      where m.status = 'approved' and m.direction = 'out' and m.kind = 'email'
        and pr.status in ('audited', 'emailed')
        and not exists (select 1 from public.suppression_list s where s.email = lower(pr.email))
      order by m.step desc, m.approved_at nulls last, m.created_at
      limit p_limit) t), '[]'::jsonb);
  elsif p_kind = 'sent_ids' then
    return coalesce((select jsonb_agg(jsonb_build_object('message_id', m.message_id, 'prospect_id', m.prospect_id, 'email', lower(pr.email), 'name', pr.name)) from public.outreach_messages m
      join public.prospects pr on pr.id = m.prospect_id
      where m.direction = 'out' and m.status = 'sent' and m.message_id is not null and m.sent_at > now() - interval '60 days'), '[]'::jsonb);
  end if;
  raise exception 'Unknown list %', p_kind;
end;
$$;

create or replace function public.app_ox_update_prospect(p_secret text, p_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  update public.prospects set
    status = coalesce(p_patch ->> 'status', status),
    skip_reason = case when p_patch ? 'skip_reason' then left(p_patch ->> 'skip_reason', 200) else skip_reason end,
    website = case when p_patch ? 'website' then left(p_patch ->> 'website', 500) else website end,
    email = case when p_patch ? 'email' then nullif(lower(p_patch ->> 'email'), '') else email end,
    email_source = case when p_patch ? 'email_source' then p_patch ->> 'email_source' else email_source end,
    audit_score = case when p_patch ? 'audit_score' then (p_patch ->> 'audit_score')::integer else audit_score end,
    lead_score = case when p_patch ? 'lead_score' then (p_patch ->> 'lead_score')::integer else lead_score end,
    lead_id = case when p_patch ? 'lead_id' then (p_patch ->> 'lead_id')::uuid else lead_id end,
    last_contacted_at = case when p_patch ? 'last_contacted_at' then (p_patch ->> 'last_contacted_at')::timestamptz else last_contacted_at end,
    updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.app_ox_save_audit(p_secret text, p_prospect uuid, p_url text, p_final_url text, p_score integer, p_result jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report text;
begin
  perform private.check_secret(p_secret);
  insert into public.prospect_audits (prospect_id, url, final_url, score, result)
  values (p_prospect, left(p_url, 500), left(p_final_url, 500), case when p_score is null then null else greatest(0, least(100, p_score)) end, p_result)
  returning report_id into v_report;
  return v_report;
end;
$$;

create or replace function public.app_ox_add_message(p_secret text, p_row jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.check_secret(p_secret);
  insert into public.outreach_messages (prospect_id, direction, step, kind, status, subject, body, message_id, in_reply_to, approved_at, sent_at)
  values ((p_row ->> 'prospect_id')::uuid, coalesce(p_row ->> 'direction', 'out'), (p_row ->> 'step')::integer, coalesce(p_row ->> 'kind', 'email'),
          coalesce(p_row ->> 'status', 'draft'), left(p_row ->> 'subject', 200), left(p_row ->> 'body', 8000),
          left(p_row ->> 'message_id', 300), left(p_row ->> 'in_reply_to', 300),
          (p_row ->> 'approved_at')::timestamptz, (p_row ->> 'sent_at')::timestamptz)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.app_ox_update_message(p_secret text, p_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  update public.outreach_messages set
    status = coalesce(p_patch ->> 'status', status),
    message_id = case when p_patch ? 'message_id' then left(p_patch ->> 'message_id', 300) else message_id end,
    in_reply_to = case when p_patch ? 'in_reply_to' then left(p_patch ->> 'in_reply_to', 300) else in_reply_to end,
    error = case when p_patch ? 'error' then left(p_patch ->> 'error', 500) else error end,
    sent_at = case when p_patch ? 'sent_at' then (p_patch ->> 'sent_at')::timestamptz else sent_at end
  where id = p_id;
end;
$$;

-- Stops everything for an address: suppression (permanent), prospect status, pending emails cancelled.
create or replace function public.app_ox_stop(p_secret text, p_email text, p_reason text, p_prospect uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_status text := case p_reason when 'unsubscribed' then 'unsubscribed' when 'bounced' then 'bounced' when 'complaint' then 'unsubscribed' else 'replied' end;
begin
  perform private.check_secret(p_secret);
  if v_email <> '' then
    insert into public.suppression_list (email, reason, prospect_id) values (v_email, p_reason, p_prospect) on conflict (email) do nothing;
  end if;
  update public.prospects set
    status = case when status in ('call', 'won', 'lost') then status else v_status end,
    updated_at = now()
  where id = p_prospect or (v_email <> '' and lower(email) = v_email);
  update public.outreach_messages set status = 'cancelled'
  where status in ('draft', 'approved') and direction = 'out'
    and prospect_id in (select id from public.prospects where id = p_prospect or (v_email <> '' and lower(email) = v_email));
end;
$$;

-- True when the address is suppressed or already belongs to another prospect (never contact twice).
create or replace function public.app_ox_is_suppressed(p_secret text, p_email text, p_exclude uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return exists (select 1 from public.suppression_list where email = lower(trim(p_email)))
    or exists (select 1 from public.prospects where lower(email) = lower(trim(p_email)) and id is distinct from p_exclude);
end;
$$;

-- Public report page (/report/<id>): only unexpired reports, only what the page shows.
create or replace function public.app_ox_report(p_secret text, p_report text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return (select jsonb_build_object('name', p.name, 'business_type', p.business_type, 'city', p.city, 'url', a.url, 'final_url', a.final_url,
            'score', a.score, 'result', a.result, 'created_at', a.created_at, 'expires_at', a.expires_at, 'expired', a.expires_at < now())
          from public.prospect_audits a join public.prospects p on p.id = a.prospect_id
          where a.report_id = p_report);
end;
$$;

-- One-click unsubscribe (/unsubscribe/<token>). Returns the business name, or null for an unknown token.
create or replace function public.app_ox_unsubscribe(p_secret text, p_token text, p_confirm boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.prospects;
begin
  perform private.check_secret(p_secret);
  select * into v from public.prospects where unsubscribe_token = p_token;
  if v.id is null then return null; end if;
  if p_confirm then
    perform public.app_ox_stop(p_secret, coalesce(v.email, ''), 'unsubscribed', v.id);
    insert into public.outreach_messages (prospect_id, direction, kind, status, subject, body)
    values (v.id, 'in', 'unsubscribe', 'received', 'Unsubscribed', 'Unsubscribed with the link in the email.');
  end if;
  return jsonb_build_object('name', v.name, 'done', p_confirm or exists (select 1 from public.suppression_list s where s.email = lower(v.email)));
end;
$$;

-- A draft's text for a test email to the owner (the recipient is fixed in code).
create or replace function public.app_ox_message_for_test(p_secret text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return (select jsonb_build_object('subject', subject, 'body', body) from public.outreach_messages where id = p_id and direction = 'out');
end;
$$;

-- Only the new functions: revoke the default PUBLIC execute, then grant to anon (server calls use the anon key + secret).
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.app_ox_state(text)',
    'public.app_ox_set(text, jsonb)',
    'public.app_ox_search(text, uuid)',
    'public.app_ox_search_ran(text, uuid, jsonb)',
    'public.app_ox_cache_get(text, text, integer)',
    'public.app_ox_cache_put(text, text, jsonb)',
    'public.app_ox_add_prospect(text, jsonb)',
    'public.app_ox_list(text, text, integer)',
    'public.app_ox_update_prospect(text, uuid, jsonb)',
    'public.app_ox_save_audit(text, uuid, text, text, integer, jsonb)',
    'public.app_ox_add_message(text, jsonb)',
    'public.app_ox_update_message(text, uuid, jsonb)',
    'public.app_ox_stop(text, text, text, uuid)',
    'public.app_ox_is_suppressed(text, text, uuid)',
    'public.app_ox_report(text, text)',
    'public.app_ox_unsubscribe(text, text, boolean)',
    'public.app_ox_message_for_test(text, uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;