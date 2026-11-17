-- Outreach: daily guarantee, active-business check, research before every email, funnel, spam blocks
-- (owner, 2026-11-17).
--
-- 0. Fix: app_ox_coverage referred to the column "found", which inside PL/pgSQL is the built-in FOUND
--    variable ("column reference found is ambiguous"). Every discovery run failed on it, so no new
--    businesses were found after 15 Nov and the queue ran dry.
-- 1. prospects.research (private research note + active signals), researched_at, checked_at
--    (qualification finished); facebook as an email source.
-- 2. outreach_messages.bounce_type: 'address' (bad address) or 'spam' (spam/policy block, 5.7.x).
-- 3. outreach_settings.cap_cut / cap_cut_at: the daily limit is lowered by 5 after 2 spam blocks in 7 days.
-- 4. app_ox_state: spam blocks, ready buffer, found backlog, last cold email time.
-- 5. Strong sites (70+) are no longer held: they get a normal email 1 with their real finding.
-- 6. app_ox_funnel: found → with email → active → researched → drafted → held (reasons) → sent.

-- ---------- 0. Coverage fix ----------
create or replace function public.app_ox_coverage(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('t', c.business_type, 'c', c.country, 'r', c.region, 'y', c.city, 'done', c.done_at is not null, 'n', c.found))
                   from public.outreach_coverage c), '[]'::jsonb);
end;
$$;

-- ---------- 1. Columns ----------
alter table public.prospects add column if not exists research jsonb;
alter table public.prospects add column if not exists researched_at timestamptz;
alter table public.prospects add column if not exists checked_at timestamptz;
alter table public.prospects drop constraint if exists prospects_email_source_check;
alter table public.prospects add constraint prospects_email_source_check check (email_source in ('osm', 'contact-page', 'facebook'));
create index if not exists prospects_checked_at_idx on public.prospects (checked_at);
create index if not exists prospects_researched_at_idx on public.prospects (researched_at);
update public.prospects set checked_at = updated_at where checked_at is null and status <> 'found';

alter table public.outreach_messages add column if not exists bounce_type text;
alter table public.outreach_messages drop constraint if exists outreach_messages_bounce_type_check;
alter table public.outreach_messages add constraint outreach_messages_bounce_type_check check (bounce_type in ('address', 'spam', 'other'));
update public.outreach_messages set bounce_type = case
  when body ~* '5\.7\.[0-9]+|spam|policy|blocked|reputation|blacklist|blocklist|denied' then 'spam'
  when body ~* '5\.1\.[0-9]+|user unknown|no such user|does not exist|unknown recipient|invalid recipient|mailbox unavailable' then 'address'
  else 'other' end
where direction = 'in' and kind = 'bounce' and bounce_type is null;

alter table public.outreach_settings add column if not exists cap_cut integer not null default 0;
alter table public.outreach_settings add column if not exists cap_cut_at timestamptz;

-- ---------- Writers ----------
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
    research = case when p_patch ? 'research' then p_patch -> 'research' else research end,
    researched_at = case when p_patch ? 'researched_at' then (p_patch ->> 'researched_at')::timestamptz else researched_at end,
    checked_at = case when p_patch ? 'checked_at' then (p_patch ->> 'checked_at')::timestamptz else checked_at end,
    updated_at = now()
  where id = p_id;
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
  insert into public.outreach_messages (prospect_id, direction, step, kind, status, subject, body, message_id, in_reply_to, approved_at, sent_at, variant, review_reason, bounce_type)
  values ((p_row ->> 'prospect_id')::uuid, coalesce(p_row ->> 'direction', 'out'), (p_row ->> 'step')::integer, coalesce(p_row ->> 'kind', 'email'),
          coalesce(p_row ->> 'status', 'draft'), left(p_row ->> 'subject', 200), left(p_row ->> 'body', 8000),
          left(p_row ->> 'message_id', 300), left(p_row ->> 'in_reply_to', 300),
          (p_row ->> 'approved_at')::timestamptz, (p_row ->> 'sent_at')::timestamptz, p_row ->> 'variant', left(p_row ->> 'review_reason', 300),
          p_row ->> 'bounce_type')
  returning id into v_id;
  return v_id;
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
    last_tick_at = case when p_patch ? 'last_tick_at' then (p_patch ->> 'last_tick_at')::timestamptz else last_tick_at end,
    cap_cut = case when p_patch ? 'cap_cut' then greatest(0, (p_patch ->> 'cap_cut')::integer) else cap_cut end,
    cap_cut_at = case when p_patch ? 'cap_cut_at' then (p_patch ->> 'cap_cut_at')::timestamptz else cap_cut_at end,
    updated_at = now()
  where id = 1;
end;
$$;

-- ---------- 4. State ----------
create or replace function public.app_ox_state(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb;
  v_since timestamptz := coalesce((select resumed_at from public.outreach_settings where id = 1), '-infinity'::timestamptz);
  v_cut_at timestamptz := coalesce((select cap_cut_at from public.outreach_settings where id = 1), '-infinity'::timestamptz);
begin
  perform private.check_secret(p_secret);
  with last50 as (
    select m.prospect_id, m.sent_at from public.outreach_messages m
    where m.direction = 'out' and m.kind = 'email' and m.status = 'sent' and m.step <= 2 and m.sent_at > v_since
    order by m.sent_at desc limit 50
  )
  select jsonb_build_object(
    'settings', (select to_jsonb(s) from public.outreach_settings s where id = 1),
    'searches', '[]'::jsonb,
    'sent_24h', (select count(*) from public.outreach_messages where direction = 'out' and kind = 'email' and status = 'sent' and sent_at > now() - interval '24 hours'),
    'sent_7d', (select count(*) from public.outreach_messages where direction = 'out' and kind = 'email' and status = 'sent' and sent_at > now() - interval '7 days'),
    'bounces_7d', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'bounce' and created_at > now() - interval '7 days'),
    'bounces_24h', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'bounce' and created_at > greatest(now() - interval '24 hours', v_since)),
    'complaints_7d', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'complaint' and created_at > greatest(now() - interval '7 days', v_since)),
    'spam_blocks_7d', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'bounce' and bounce_type = 'spam' and created_at > now() - interval '7 days'),
    -- Spam blocks since the last automatic cut (or in the last 7 days): 2 of them lower the limit again.
    'spam_blocks_since_cut', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'bounce' and bounce_type = 'spam'
                              and created_at > greatest(now() - interval '7 days', v_cut_at)),
    'last50_sent', (select count(*) from last50),
    'last50_bounces', (select count(*) from last50 l where exists (
      select 1 from public.outreach_messages b where b.prospect_id = l.prospect_id and b.direction = 'in' and b.kind = 'bounce' and b.created_at >= l.sent_at)),
    'found_24h', (select count(*) from public.prospects where created_at > now() - interval '24 hours'),
    'backlog_found', (select count(*) from public.prospects where status = 'found'),
    'to_prepare', (select count(*) from public.prospects pr where pr.status = 'audited' and pr.email is not null
                   and not exists (select 1 from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.kind = 'email' and m.status <> 'cancelled')),
    -- Ready buffer: checked email-1 drafts waiting to go out (US/Canada count only once they can be sent).
    'ready', (select count(*) from public.outreach_messages m join public.prospects pr on pr.id = m.prospect_id
              where m.direction = 'out' and m.kind = 'email' and m.step = 0 and m.status = 'approved' and pr.status = 'audited'),
    'ready_by_country', coalesce((select jsonb_object_agg(country, n) from (
              select pr.country, count(*) as n from public.outreach_messages m join public.prospects pr on pr.id = m.prospect_id
              where m.direction = 'out' and m.kind = 'email' and m.step = 0 and m.status = 'approved' and pr.status = 'audited' group by pr.country) t), '{}'::jsonb),
    'last_cold_sent_at', (select max(sent_at) from public.outreach_messages where direction = 'out' and kind = 'email' and status = 'sent' and step <= 2)
  ) into v;
  return v;
end;
$$;

-- ---------- 5. Strong sites are drafted like any other (cancelled drafts don't block a new one) ----------
update public.prospects set status = 'audited', skip_reason = null where status = 'held';

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
    -- Best leads first (quality score). A cancelled draft doesn't block a new one.
    return coalesce((select jsonb_agg(to_jsonb(p)) from (
      select pr.*, (select to_jsonb(a) from public.prospect_audits a where a.prospect_id = pr.id order by a.created_at desc limit 1) as audit
      from public.prospects pr
      where pr.status = 'audited' and pr.email is not null
        and not exists (select 1 from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.kind = 'email' and m.status <> 'cancelled')
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
    -- Replies first; then the niche, and then the country, with the fewest sends in the last 24 h; then the best lead.
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

-- ---------- 6. Funnel ----------
-- Each stage counts what happened in the period: found (new businesses), checked (qualification
-- finished), with email, active check run / passed, researched (note saved), drafted, held (with the
-- reasons), sent (first emails).
create or replace function public.app_ox_funnel(p_secret text, p_from timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return jsonb_build_object(
    'found', (select count(*) from public.prospects where created_at >= p_from),
    'checked', (select count(*) from public.prospects where checked_at >= p_from),
    'with_email', (select count(*) from public.prospects where checked_at >= p_from and coalesce(email, '') <> ''),
    'active_checked', (select count(*) from public.prospects where researched_at >= p_from),
    'active', (select count(*) from public.prospects where researched_at >= p_from and coalesce((research ->> 'active')::boolean, false)),
    'researched', (select count(*) from public.prospects where researched_at >= p_from and coalesce((research ->> 'active')::boolean, false) and research ? 'note'),
    'drafted', (select count(*) from public.outreach_messages where direction = 'out' and kind = 'email' and step = 0 and created_at >= p_from),
    'queued', (select count(*) from public.outreach_messages where direction = 'out' and kind = 'email' and step = 0 and status = 'approved' and created_at >= p_from),
    'sent', (select count(*) from public.outreach_messages where direction = 'out' and kind = 'email' and step = 0 and status = 'sent' and sent_at >= p_from),
    'held', coalesce((select jsonb_agg(jsonb_build_object('reason', reason, 'n', n) order by n desc) from (
      select reason, count(*) as n from (
        select case
                 when pr.status = 'whatsapp' then 'No public email (WhatsApp/Instagram queue)'
                 when pr.status = 'waiting' then 'US/Canada: waiting for a postal address'
                 else regexp_replace(coalesce(pr.skip_reason, pr.status), '\d+', 'N', 'g')
               end as reason
        from public.prospects pr
        where pr.status in ('skipped', 'whatsapp', 'waiting', 'held')
          and greatest(coalesce(pr.checked_at, '-infinity'), coalesce(pr.researched_at, '-infinity'), pr.updated_at) >= p_from
        union all
        select 'Needs a look: ' || coalesce(m.review_reason, 'review')
        from public.outreach_messages m
        where m.direction = 'out' and m.step = 0 and m.status = 'review' and m.created_at >= p_from
      ) r group by reason) t), '[]'::jsonb)
  );
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.app_ox_coverage(text)',
    'public.app_ox_update_prospect(text, uuid, jsonb)',
    'public.app_ox_add_message(text, jsonb)',
    'public.app_ox_set(text, jsonb)',
    'public.app_ox_state(text)',
    'public.app_ox_list(text, text, integer)',
    'public.app_ox_funnel(text, timestamptz)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;

-- ---------- 7. Lead map (owner, 2026-11-17) ----------
-- Position of each business (from OpenStreetMap) and its neighbourhood/district from the address tags.
alter table public.prospects add column if not exists lat double precision;
alter table public.prospects add column if not exists lon double precision;
alter table public.prospects add column if not exists area text generated always as (
  left(coalesce(nullif(osm_tags ->> 'addr:suburb', ''), nullif(osm_tags ->> 'addr:district', ''), nullif(osm_tags ->> 'addr:quarter', ''),
                nullif(osm_tags ->> 'addr:neighbourhood', ''), nullif(osm_tags ->> 'addr:hamlet', '')), 80)) stored;

-- Backfill positions from the cached Overpass results (same OSM ids).
update public.prospects p set lat = (x.e ->> 'lat')::double precision, lon = (x.e ->> 'lon')::double precision
from (select jsonb_array_elements(value) as e from public.outreach_cache where key like 'overpass:%' and jsonb_typeof(value) = 'array') x
where p.lat is null and x.e ->> 'osmId' = p.osm_id;

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
  insert into public.prospects (search_id, osm_id, name, business_type, city, region, country, timezone, website, domain, phone, email, email_source, instagram, osm_tags, lat, lon)
  values ((p_row ->> 'search_id')::uuid, p_row ->> 'osm_id', left(p_row ->> 'name', 160), p_row ->> 'business_type', left(p_row ->> 'city', 80),
          left(p_row ->> 'region', 80), p_row ->> 'country', p_row ->> 'timezone', left(p_row ->> 'website', 500), v_domain, left(p_row ->> 'phone', 60),
          v_email, case when v_email is not null then 'osm' end, left(p_row ->> 'instagram', 300), coalesce(p_row -> 'osm_tags', '{}'::jsonb),
          (p_row ->> 'lat')::double precision, (p_row ->> 'lon')::double precision)
  on conflict (osm_id) do nothing
  returning id into v_id;
  return v_id;
end;
$$;

-- Everything the Map tab needs in one call: cells (niche x city), city centres from the Nominatim
-- cache, and every business with its outcome (compact keys).
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
    'cells', coalesce((select jsonb_agg(jsonb_build_object('t', c.business_type, 'c', c.country, 'r', c.region, 'y', c.city, 'done', c.done_at is not null, 'n', c.found, 'at', c.updated_at))
                       from public.outreach_coverage c), '[]'::jsonb),
    'centres', coalesce((select jsonb_object_agg(substr(key, 11), jsonb_build_object('lat', value -> 'lat', 'lon', value -> 'lon'))
                         from public.outreach_cache where key like 'nominatim:%'), '{}'::jsonb),
    'businesses', coalesce((select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'n', pr.name, 't', pr.business_type, 'y', pr.city, 'r', pr.region, 'c', pr.country, 'a', pr.area,
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

revoke execute on function public.app_ox_add_prospect(text, jsonb) from public, anon, authenticated;
grant execute on function public.app_ox_add_prospect(text, jsonb) to anon;
revoke execute on function public.app_ox_map(text) from public, anon, authenticated;
grant execute on function public.app_ox_map(text) to anon;
