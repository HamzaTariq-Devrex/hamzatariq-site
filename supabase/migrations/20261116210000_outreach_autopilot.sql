-- Outreach autopilot (owner, 2026-11-16):
-- 1. No daily approval: approve_first off. A draft that passes every automatic check is queued as
--    'approved'; an uncertain one becomes 'review' ("Needs a look", review_reason) and expires after
--    7 days ('expired'). Old unsent drafts are removed so they go through the new checks.
-- 2. Area-by-area coverage: outreach_coverage records each (niche x city) cell once it has been
--    searched. The area list itself lives in src/lib/outreach/areas.ts. New Zealand added.
-- 3. No website: prospect_previews (/preview/<id>, 30 days) and prospects.preview_id.
-- 4. prospects.flags (verification notes for the checks) and qualified_at (daily target per niche).
-- 5. Replies: 'price' class (auto-answered with real starting prices).
-- 6. Fair share: the send queue is ordered by fewest sends in the last 24 h per niche, then country.
-- 7. Daily summary numbers in one call.

-- ---------- Columns and constraints ----------
alter table public.prospects drop constraint if exists prospects_country_check;
alter table public.prospects add constraint prospects_country_check check (country in ('US', 'GB', 'AE', 'CA', 'AU', 'NZ'));
alter table public.outreach_searches drop constraint if exists outreach_searches_country_check;
alter table public.outreach_searches add constraint outreach_searches_country_check check (country in ('US', 'GB', 'AE', 'CA', 'AU', 'NZ'));

alter table public.prospects
  add column if not exists flags jsonb not null default '{}'::jsonb,
  add column if not exists qualified_at timestamptz,
  add column if not exists preview_id text check (char_length(preview_id) <= 40),
  add column if not exists region text check (char_length(region) <= 80);
create index if not exists prospects_qualified_idx on public.prospects (business_type, qualified_at);

alter table public.prospects drop constraint if exists prospects_reply_class_check;
alter table public.prospects add constraint prospects_reply_class_check
  check (reply_class in ('interested', 'price', 'question', 'not_now', 'no', 'out_of_office', 'bounce'));

alter table public.outreach_messages drop constraint if exists outreach_messages_status_check;
alter table public.outreach_messages add constraint outreach_messages_status_check
  check (status in ('draft', 'approved', 'review', 'expired', 'sent', 'failed', 'cancelled', 'received'));
alter table public.outreach_messages add column if not exists review_reason text check (char_length(review_reason) <= 300);
create index if not exists outreach_messages_review_idx on public.outreach_messages (created_at) where status = 'review';

update public.outreach_settings set approve_first = false, updated_at = now() where id = 1;
delete from public.outreach_messages where direction = 'out' and status in ('draft', 'approved') and step = 0;

-- ---------- Coverage ----------
create table if not exists public.outreach_coverage (
  business_type text not null check (char_length(business_type) <= 40),
  country text not null check (country in ('US', 'GB', 'AE', 'CA', 'AU', 'NZ')),
  region text not null check (char_length(region) <= 80),
  city text not null check (char_length(city) <= 80),
  done_at timestamptz,
  found integer not null default 0,
  attempts integer not null default 0,
  error text check (char_length(error) <= 300),
  updated_at timestamptz not null default now(),
  primary key (business_type, country, region, city)
);
alter table public.outreach_coverage enable row level security;
create policy "Owner reads coverage" on public.outreach_coverage for select to authenticated using ((select public.is_owner()));
revoke all on public.outreach_coverage from anon, authenticated;
grant select on public.outreach_coverage to authenticated;

-- Cells already searched (done) or failed, for picking the next cell.
create or replace function public.app_ox_coverage(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('t', business_type, 'c', country, 'r', region, 'y', city, 'done', done_at is not null, 'n', found))
                   from public.outreach_coverage), '[]'::jsonb);
end;
$$;

-- Marks a cell searched (p_done) or records a failed attempt; three failures also mark it done.
create or replace function public.app_ox_coverage_mark(p_secret text, p_type text, p_country text, p_region text, p_city text, p_found integer, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  insert into public.outreach_coverage as c (business_type, country, region, city, done_at, found, attempts, error)
  values (p_type, p_country, p_region, p_city, case when p_error is null then now() end, coalesce(p_found, 0), 1, left(p_error, 300))
  on conflict (business_type, country, region, city) do update set
    attempts = c.attempts + 1,
    found = c.found + coalesce(p_found, 0),
    error = left(p_error, 300),
    done_at = case when p_error is null or c.attempts + 1 >= 3 then coalesce(c.done_at, now()) else c.done_at end,
    updated_at = now();
end;
$$;

-- Per niche: qualified in the last 24 h and still waiting for an audit.
create or replace function public.app_ox_niche_stats(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return coalesce((select jsonb_object_agg(business_type, jsonb_build_object('q', q, 'backlog', b)) from (
    select business_type,
           count(*) filter (where qualified_at > now() - interval '24 hours') as q,
           count(*) filter (where status = 'found') as b
    from public.prospects group by business_type) t), '{}'::jsonb);
end;
$$;

-- ---------- Homepage concepts for businesses without a website ----------
create table if not exists public.prospect_previews (
  id text primary key default encode(extensions.gen_random_bytes(12), 'hex'),
  prospect_id uuid not null unique references public.prospects (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
alter table public.prospect_previews enable row level security;
create policy "Owner reads previews" on public.prospect_previews for select to authenticated using ((select public.is_owner()));
revoke all on public.prospect_previews from anon, authenticated;
grant select on public.prospect_previews to authenticated;

create or replace function public.app_ox_preview_create(p_secret text, p_prospect uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
begin
  perform private.check_secret(p_secret);
  insert into public.prospect_previews (prospect_id) values (p_prospect)
  on conflict (prospect_id) do update set prospect_id = excluded.prospect_id
  returning id into v_id;
  update public.prospects set preview_id = v_id, updated_at = now() where id = p_prospect;
  return v_id;
end;
$$;

-- Public details only: name, niche, city, country, phone and the address / opening-hours tags.
create or replace function public.app_ox_preview(p_secret text, p_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return (select jsonb_build_object('name', p.name, 'business_type', p.business_type, 'city', p.city, 'country', p.country, 'phone', p.phone,
            'tags', (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from jsonb_each_text(p.osm_tags)
                     where key in ('opening_hours', 'addr:housenumber', 'addr:street', 'addr:city', 'addr:postcode', 'addr:suburb', 'addr:state', 'craft', 'shop', 'amenity', 'tourism', 'cuisine')),
            'created_at', v.created_at, 'expires_at', v.expires_at, 'expired', v.expires_at < now())
          from public.prospect_previews v join public.prospects p on p.id = v.prospect_id
          where v.id = p_id);
end;
$$;

-- ---------- Prospect updates (adds flags, qualified_at, domain, region) ----------
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
    domain = case when p_patch ? 'domain' then left(p_patch ->> 'domain', 255) else domain end,
    email = case when p_patch ? 'email' then nullif(lower(p_patch ->> 'email'), '') else email end,
    email_source = case when p_patch ? 'email_source' then p_patch ->> 'email_source' else email_source end,
    audit_score = case when p_patch ? 'audit_score' then (p_patch ->> 'audit_score')::integer else audit_score end,
    lead_score = case when p_patch ? 'lead_score' then (p_patch ->> 'lead_score')::integer else lead_score end,
    lead_id = case when p_patch ? 'lead_id' then (p_patch ->> 'lead_id')::uuid else lead_id end,
    last_contacted_at = case when p_patch ? 'last_contacted_at' then (p_patch ->> 'last_contacted_at')::timestamptz else last_contacted_at end,
    reply_class = case when p_patch ? 'reply_class' then p_patch ->> 'reply_class' else reply_class end,
    snooze_until = case when p_patch ? 'snooze_until' then (p_patch ->> 'snooze_until')::timestamptz else snooze_until end,
    next_followup_at = case when p_patch ? 'next_followup_at' then (p_patch ->> 'next_followup_at')::timestamptz else next_followup_at end,
    instagram = case when p_patch ? 'instagram' then left(p_patch ->> 'instagram', 300) else instagram end,
    phone = case when p_patch ? 'phone' then left(p_patch ->> 'phone', 60) else phone end,
    flags = case when p_patch ? 'flags' then flags || (p_patch -> 'flags') else flags end,
    qualified_at = case when p_patch ? 'qualified_at' then (p_patch ->> 'qualified_at')::timestamptz else qualified_at end,
    updated_at = now()
  where id = p_id;
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
  -- Same dedupe as before: OSM id, website domain, email, suppression list.
  if exists (select 1 from public.prospects where osm_id = p_row ->> 'osm_id') then return null; end if;
  if v_domain is not null and exists (select 1 from public.prospects where lower(domain) = v_domain) then return null; end if;
  if v_email is not null and (exists (select 1 from public.prospects where lower(email) = v_email)
    or exists (select 1 from public.suppression_list where email = v_email)) then return null; end if;
  insert into public.prospects (search_id, osm_id, name, business_type, city, region, country, timezone, website, domain, phone, email, email_source, instagram, osm_tags)
  values ((p_row ->> 'search_id')::uuid, p_row ->> 'osm_id', left(p_row ->> 'name', 160), p_row ->> 'business_type', left(p_row ->> 'city', 80),
          left(p_row ->> 'region', 80), p_row ->> 'country', p_row ->> 'timezone', left(p_row ->> 'website', 500), v_domain, left(p_row ->> 'phone', 60),
          v_email, case when v_email is not null then 'osm' end, left(p_row ->> 'instagram', 300), coalesce(p_row -> 'osm_tags', '{}'::jsonb))
  on conflict (osm_id) do nothing
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- Messages (adds review_reason and approved_at) ----------
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
  insert into public.outreach_messages (prospect_id, direction, step, kind, status, subject, body, message_id, in_reply_to, approved_at, sent_at, variant, review_reason)
  values ((p_row ->> 'prospect_id')::uuid, coalesce(p_row ->> 'direction', 'out'), (p_row ->> 'step')::integer, coalesce(p_row ->> 'kind', 'email'),
          coalesce(p_row ->> 'status', 'draft'), left(p_row ->> 'subject', 200), left(p_row ->> 'body', 8000),
          left(p_row ->> 'message_id', 300), left(p_row ->> 'in_reply_to', 300),
          (p_row ->> 'approved_at')::timestamptz, (p_row ->> 'sent_at')::timestamptz, p_row ->> 'variant', left(p_row ->> 'review_reason', 300))
  returning id into v_id;
  return v_id;
end;
$$;

-- "Needs a look" drafts nobody opened in 7 days expire; the business is skipped.
create or replace function public.app_ox_expire_reviews(p_secret text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  perform private.check_secret(p_secret);
  with e as (
    update public.outreach_messages set status = 'expired'
    where status = 'review' and created_at < now() - interval '7 days'
    returning prospect_id
  )
  update public.prospects p set status = 'skipped', skip_reason = 'Needs a look: not checked within 7 days', updated_at = now()
  from e where p.id = e.prospect_id and p.status in ('audited', 'found');
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------- Work lists: fair audits, fair sending, US allowed once the address is set (checked in code) ----------
create or replace function public.app_ox_list(p_secret text, p_kind text, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  if p_kind = 'to_audit' then
    -- The niche with the fewest qualified leads in the last 24 h goes first.
    return coalesce((select jsonb_agg(to_jsonb(p)) from (
      select pr.* from public.prospects pr
      left join (select business_type, count(*) as n from public.prospects where qualified_at > now() - interval '24 hours' group by business_type) q
        on q.business_type = pr.business_type
      where pr.status = 'found'
      order by coalesce(q.n, 0), pr.created_at
      limit p_limit) p), '[]'::jsonb);
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
                    where m.prospect_id = pr.id and m.direction = 'out' and m.kind = 'email' and m.step <= 2 and m.status in ('draft', 'approved', 'review', 'sent')) n on true
      where pr.status = 'emailed' and n.step <= 2
        and (pr.snooze_until is null or pr.snooze_until < now())
        and f.sent_at <= now() - make_interval(days => case n.step when 1 then 3 else 7 end)
        and not exists (select 1 from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'in' and m.kind in ('reply', 'bounce', 'unsubscribe', 'complaint'))
        and not exists (select 1 from public.suppression_list s where s.email = lower(pr.email))
      limit p_limit) t), '[]'::jsonb);
  elsif p_kind = 'checkbacks' then
    return coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('prospect', to_jsonb(pr),
        'first', (select to_jsonb(f) from public.outreach_messages f where f.prospect_id = pr.id and f.direction = 'out' and f.step = 0 and f.status = 'sent' limit 1)) as x
      from public.prospects pr
      where pr.reply_class = 'not_now' and pr.next_followup_at <= now() and pr.email is not null
        and not exists (select 1 from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.step = 4)
        and not exists (select 1 from public.suppression_list s where s.email = lower(pr.email))
      limit p_limit) t), '[]'::jsonb);
  elsif p_kind = 'approved' then
    -- Replies first; then the niche, and then the country, with the fewest sends in the last 24 h.
    return coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('message', to_jsonb(m), 'prospect', to_jsonb(pr),
        'thread', (select jsonb_build_object('message_id', f.message_id, 'subject', f.subject) from public.outreach_messages f
                   where f.prospect_id = pr.id and f.direction = 'out' and f.step = 0 and f.status = 'sent' limit 1)) as x
      from public.outreach_messages m join public.prospects pr on pr.id = m.prospect_id
      left join (select p2.business_type, count(*) as n from public.outreach_messages s2 join public.prospects p2 on p2.id = s2.prospect_id
                 where s2.direction = 'out' and s2.status = 'sent' and s2.sent_at > now() - interval '24 hours' group by p2.business_type) bn on bn.business_type = pr.business_type
      left join (select p3.country, count(*) as n from public.outreach_messages s3 join public.prospects p3 on p3.id = s3.prospect_id
                 where s3.direction = 'out' and s3.status = 'sent' and s3.sent_at > now() - interval '24 hours' group by p3.country) bc on bc.country = pr.country
      where m.status = 'approved' and m.direction = 'out' and m.kind = 'email'
        and (
          (m.step <= 2 and pr.status in ('audited', 'emailed') and (pr.snooze_until is null or pr.snooze_until < now()))
          or (m.step >= 3 and pr.status not in ('unsubscribed', 'bounced', 'lost', 'won'))
        )
        and not exists (select 1 from public.suppression_list s where s.email = lower(pr.email))
      order by (m.step >= 3) desc, coalesce(bn.n, 0), coalesce(bc.n, 0), m.step desc, pr.lead_score desc nulls last, m.created_at
      limit p_limit) t), '[]'::jsonb);
  elsif p_kind = 'sent_ids' then
    return coalesce((select jsonb_agg(jsonb_build_object('message_id', m.message_id, 'prospect_id', m.prospect_id, 'email', lower(pr.email), 'name', pr.name)) from public.outreach_messages m
      join public.prospects pr on pr.id = m.prospect_id
      where m.direction = 'out' and m.status = 'sent' and m.message_id is not null and m.sent_at > now() - interval '120 days'), '[]'::jsonb);
  end if;
  raise exception 'Unknown list %', p_kind;
end;
$$;

-- ---------- Daily summary ----------
create or replace function public.app_ox_daily_summary(p_secret text, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return jsonb_build_object(
    'sent_first', (select count(*) from public.outreach_messages where direction = 'out' and status = 'sent' and step = 0 and sent_at >= p_from and sent_at < p_to),
    'sent_followups', (select count(*) from public.outreach_messages where direction = 'out' and status = 'sent' and step in (1, 2, 4) and sent_at >= p_from and sent_at < p_to),
    'sent_replies', (select count(*) from public.outreach_messages where direction = 'out' and status = 'sent' and step = 3 and sent_at >= p_from and sent_at < p_to),
    'replies', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'reply' and created_at >= p_from and created_at < p_to),
    'by_class', coalesce((select jsonb_object_agg(c, n) from (
      select coalesce(p.reply_class, '-') as c, count(distinct p.id) as n from public.outreach_messages m join public.prospects p on p.id = m.prospect_id
      where m.direction = 'in' and m.kind = 'reply' and m.created_at >= p_from and m.created_at < p_to group by 1) t), '{}'::jsonb),
    'bounces', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'bounce' and created_at >= p_from and created_at < p_to),
    'hot', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'email', p.email, 'phone', p.phone, 'type', p.business_type, 'city', p.city, 'country', p.country,
              'reply', left((select r.body from public.outreach_messages r where r.prospect_id = p.id and r.direction = 'in' and r.kind = 'reply' order by r.created_at desc limit 1), 300),
              'lead_id', p.lead_id) order by p.updated_at desc)
            from public.prospects p
            where p.reply_class = 'question' and p.status not in ('won', 'lost')
              and exists (select 1 from public.outreach_messages r where r.prospect_id = p.id and r.direction = 'in' and r.kind = 'reply' and r.created_at > p_to - interval '7 days')), '[]'::jsonb),
    'auto_answered', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'class', p.reply_class, 'phone', p.phone, 'email', p.email))
            from public.prospects p
            where p.reply_class in ('interested', 'price')
              and exists (select 1 from public.outreach_messages r where r.prospect_id = p.id and r.direction = 'in' and r.kind = 'reply' and r.created_at >= p_from and r.created_at < p_to)), '[]'::jsonb),
    'demos', (select count(*) from public.prospect_previews where created_at >= p_from and created_at < p_to),
    'qualified', (select count(*) from public.prospects where qualified_at >= p_from and qualified_at < p_to),
    'needs_look', (select count(*) from public.outreach_messages where status = 'review'),
    'queued', (select count(*) from public.outreach_messages where status = 'approved' and direction = 'out'),
    'paused', (select paused from public.outreach_settings where id = 1),
    'pause_reason', (select pause_reason from public.outreach_settings where id = 1)
  );
end;
$$;

-- ---------- Admin stats: "Needs a look" replaces "Ready to approve"; price counts as positive ----------
create or replace function public.app_admin_outreach_stats(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  perform private.check_secret(p_secret);
  with firsts as (
    select m.prospect_id, m.variant, p.business_type, p.reply_class,
           exists (select 1 from public.outreach_messages r where r.prospect_id = m.prospect_id and r.direction = 'in' and r.kind = 'reply') as replied,
           exists (select 1 from public.outreach_messages b where b.prospect_id = m.prospect_id and b.direction = 'in' and b.kind = 'bounce') as bounced
    from public.outreach_messages m join public.prospects p on p.id = m.prospect_id
    where m.direction = 'out' and m.kind = 'email' and m.step = 0 and m.status = 'sent'
  )
  select jsonb_build_object(
    'sent', (select count(*) from public.outreach_messages where direction = 'out' and kind = 'email' and status = 'sent'),
    'prospects_emailed', (select count(*) from firsts),
    'replies', (select count(*) from firsts where replied),
    'positive', (select count(*) from firsts where reply_class in ('interested', 'price', 'question')),
    'bounces', (select count(*) from firsts where bounced),
    'suppressed', (select count(*) from public.suppression_list),
    'by_niche', coalesce((select jsonb_agg(jsonb_build_object('key', business_type, 'sent', n, 'replies', r, 'positive', pos) order by n desc) from (
      select business_type, count(*) as n, count(*) filter (where replied) as r, count(*) filter (where reply_class in ('interested', 'price', 'question')) as pos
      from firsts group by business_type) t), '[]'::jsonb),
    'by_variant', coalesce((select jsonb_agg(jsonb_build_object('key', coalesce(variant, '-'), 'sent', n, 'replies', r, 'positive', pos) order by variant) from (
      select variant, count(*) as n, count(*) filter (where replied) as r, count(*) filter (where reply_class in ('interested', 'price', 'question')) as pos
      from firsts group by variant) t), '[]'::jsonb),
    'tabs', jsonb_build_object(
      'ready', (select count(*) from public.outreach_messages where direction = 'out' and status = 'review'),
      'sent', (select count(*) from public.outreach_messages where direction = 'out' and status = 'sent'),
      'hot', (select count(*) from public.prospects where reply_class in ('interested', 'price', 'question') and status not in ('won', 'lost')),
      'whatsapp', (select count(*) from public.prospects where status = 'whatsapp'),
      'suppressed', (select count(*) from public.suppression_list)
    )
  ) into v;
  return v;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.app_ox_coverage(text)',
    'public.app_ox_coverage_mark(text, text, text, text, text, integer, text)',
    'public.app_ox_niche_stats(text)',
    'public.app_ox_preview_create(text, uuid)',
    'public.app_ox_preview(text, text)',
    'public.app_ox_expire_reviews(text)',
    'public.app_ox_daily_summary(text, timestamptz, timestamptz)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;

-- Redraft from "Needs a look": review drafts can be deleted and rewritten too (never sent ones only).
create or replace function public.app_ox_delete_draft(p_secret text, p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prospect uuid;
begin
  perform private.check_secret(p_secret);
  delete from public.outreach_messages where id = p_id and status in ('draft', 'review') and direction = 'out'
  returning prospect_id into v_prospect;
  return v_prospect;
end;
$$;
