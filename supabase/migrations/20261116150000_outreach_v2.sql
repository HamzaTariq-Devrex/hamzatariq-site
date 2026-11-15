-- Outreach v2 (owner, 2026-11-16): plain-language email 1 with A/B subjects, day 3 and day 7
-- follow-ups, reply classification (hot replies get an approve-first reply draft, "not now" gets one
-- check-back after 60 days, out-of-office snoozes the sequence 7 days), bounce guard over the last
-- 50 emails, domain-level dedupe, 60-day reports and admin stats per niche and subject variant.

-- ---------- Columns ----------
alter table public.prospects
  add column if not exists reply_class text check (reply_class in ('interested', 'question', 'not_now', 'no', 'out_of_office', 'bounce')),
  add column if not exists snooze_until timestamptz,
  add column if not exists next_followup_at timestamptz,
  add column if not exists instagram text check (char_length(instagram) <= 300);

alter table public.outreach_messages
  add column if not exists variant text check (variant in ('A', 'B'));
-- Steps: 0 email 1, 1 day-3 follow-up, 2 day-7 last email, 3 reply to a hot reply, 4 "not now" check-back.
alter table public.outreach_messages drop constraint if exists outreach_messages_step_check;
alter table public.outreach_messages add constraint outreach_messages_step_check check (step between 0 and 4);
alter table public.outreach_messages drop constraint if exists outreach_messages_kind_check;
alter table public.outreach_messages add constraint outreach_messages_kind_check
  check (kind in ('email', 'reply', 'bounce', 'unsubscribe', 'complaint', 'auto-reply', 'test'));

alter table public.outreach_settings add column if not exists resumed_at timestamptz;
grant update (resumed_at) on public.outreach_settings to authenticated;
grant update (reply_class) on public.prospects to authenticated;

-- Reports now stay up for 60 days.
alter table public.prospect_audits alter column expires_at set default now() + interval '60 days';
update public.prospect_audits set expires_at = created_at + interval '60 days' where expires_at < created_at + interval '60 days';

create index if not exists prospects_reply_idx on public.prospects (reply_class) where reply_class is not null;
create index if not exists outreach_messages_variant_idx on public.outreach_messages (variant) where variant is not null;

-- ---------- Settings, counters and the bounce guard ----------
create or replace function public.app_ox_state(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb;
  v_since timestamptz := coalesce((select resumed_at from public.outreach_settings where id = 1), '-infinity'::timestamptz);
begin
  perform private.check_secret(p_secret);
  with last50 as (
    select m.prospect_id, m.sent_at from public.outreach_messages m
    where m.direction = 'out' and m.kind = 'email' and m.status = 'sent' and m.step <= 2 and m.sent_at > v_since
    order by m.sent_at desc limit 50
  )
  select jsonb_build_object(
    'settings', (select to_jsonb(s) from public.outreach_settings s where id = 1),
    'searches', coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at) from public.outreach_searches q where q.active), '[]'::jsonb),
    'sent_24h', (select count(*) from public.outreach_messages where direction = 'out' and kind = 'email' and status = 'sent' and sent_at > now() - interval '24 hours'),
    'sent_7d', (select count(*) from public.outreach_messages where direction = 'out' and kind = 'email' and status = 'sent' and sent_at > now() - interval '7 days'),
    'bounces_7d', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'bounce' and created_at > now() - interval '7 days'),
    'complaints_7d', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'complaint' and created_at > greatest(now() - interval '7 days', v_since)),
    'last50_sent', (select count(*) from last50),
    'last50_bounces', (select count(*) from last50 l where exists (
      select 1 from public.outreach_messages b where b.prospect_id = l.prospect_id and b.direction = 'in' and b.kind = 'bounce' and b.created_at >= l.sent_at)),
    'found_24h', (select count(*) from public.prospects where created_at > now() - interval '24 hours')
  ) into v;
  return v;
end;
$$;

-- ---------- Prospect updates (new fields) ----------
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
    reply_class = case when p_patch ? 'reply_class' then p_patch ->> 'reply_class' else reply_class end,
    snooze_until = case when p_patch ? 'snooze_until' then (p_patch ->> 'snooze_until')::timestamptz else snooze_until end,
    next_followup_at = case when p_patch ? 'next_followup_at' then (p_patch ->> 'next_followup_at')::timestamptz else next_followup_at end,
    instagram = case when p_patch ? 'instagram' then left(p_patch ->> 'instagram', 300) else instagram end,
    phone = case when p_patch ? 'phone' then left(p_patch ->> 'phone', 60) else phone end,
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
  insert into public.outreach_messages (prospect_id, direction, step, kind, status, subject, body, message_id, in_reply_to, approved_at, sent_at, variant)
  values ((p_row ->> 'prospect_id')::uuid, coalesce(p_row ->> 'direction', 'out'), (p_row ->> 'step')::integer, coalesce(p_row ->> 'kind', 'email'),
          coalesce(p_row ->> 'status', 'draft'), left(p_row ->> 'subject', 200), left(p_row ->> 'body', 8000),
          left(p_row ->> 'message_id', 300), left(p_row ->> 'in_reply_to', 300),
          (p_row ->> 'approved_at')::timestamptz, (p_row ->> 'sent_at')::timestamptz, p_row ->> 'variant')
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- Stop ----------
-- unsubscribed / bounced / complaint: permanent suppression. replied: the sequence stops (pending
-- follow-ups cancelled) but the address is not suppressed, so Hamza's approved reply can still go out.
create or replace function public.app_ox_stop(p_secret text, p_email text, p_reason text, p_prospect uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_status text := case p_reason when 'unsubscribed' then 'unsubscribed' when 'bounced' then 'bounced' when 'complaint' then 'unsubscribed' else 'replied' end;
begin
  perform private.check_secret(p_secret);
  if v_email <> '' and p_reason in ('unsubscribed', 'bounced', 'complaint') then
    insert into public.suppression_list (email, reason, prospect_id) values (v_email, p_reason, p_prospect) on conflict (email) do nothing;
  end if;
  update public.prospects set
    status = case when status in ('call', 'won', 'lost') then status else v_status end,
    updated_at = now()
  where id = p_prospect or (v_email <> '' and lower(email) = v_email);
  update public.outreach_messages set status = 'cancelled'
  where status in ('draft', 'approved') and direction = 'out'
    and (p_reason <> 'replied' or step <= 2)
    and prospect_id in (select id from public.prospects where id = p_prospect or (v_email <> '' and lower(email) = v_email));
end;
$$;

-- True when another prospect at the same email domain has already been emailed (company domains
-- only; free mail providers are per person).
create or replace function public.app_ox_domain_emailed(p_secret text, p_email text, p_exclude uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text := lower(split_part(coalesce(p_email, ''), '@', 2));
begin
  perform private.check_secret(p_secret);
  if v_domain = '' or v_domain in ('gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'live.co.uk',
    'yahoo.com', 'yahoo.co.uk', 'icloud.com', 'me.com', 'aol.com', 'btinternet.com', 'sky.com', 'protonmail.com', 'proton.me', 'gmx.com', 'mail.com') then
    return false;
  end if;
  return exists (
    select 1 from public.prospects p
    join public.outreach_messages m on m.prospect_id = p.id and m.direction = 'out' and m.status = 'sent' and m.kind = 'email'
    where p.id <> p_exclude and lower(split_part(p.email, '@', 2)) = v_domain
  );
end;
$$;

-- ---------- Work lists ----------
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
      where pr.status = 'audited' and pr.email is not null and pr.country <> 'US'
        and not exists (select 1 from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.kind = 'email')
        and not exists (select 1 from public.suppression_list s where s.email = lower(pr.email))
      order by pr.lead_score desc nulls last, pr.created_at
      limit p_limit) p), '[]'::jsonb);
  elsif p_kind = 'followups' then
    -- Day 3 and day 7 after email 1; an out-of-office reply snoozes the sequence.
    return coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('prospect', to_jsonb(pr), 'first', to_jsonb(f), 'next_step', n.step,
        'audit', (select to_jsonb(a) from public.prospect_audits a where a.prospect_id = pr.id order by a.created_at desc limit 1)) as x
      from public.prospects pr
      join lateral (select * from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.kind = 'email' and m.step = 0 and m.status = 'sent' limit 1) f on true
      join lateral (select coalesce(max(m.step), 0) + 1 as step from public.outreach_messages m
                    where m.prospect_id = pr.id and m.direction = 'out' and m.kind = 'email' and m.step <= 2 and m.status in ('draft', 'approved', 'sent')) n on true
      where pr.status = 'emailed' and n.step <= 2
        and (pr.snooze_until is null or pr.snooze_until < now())
        and f.sent_at <= now() - make_interval(days => case n.step when 1 then 3 else 7 end)
        and not exists (select 1 from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'in' and m.kind in ('reply', 'bounce', 'unsubscribe', 'complaint'))
        and not exists (select 1 from public.suppression_list s where s.email = lower(pr.email))
      limit p_limit) t), '[]'::jsonb);
  elsif p_kind = 'checkbacks' then
    -- "Not now" replies: one check-back email 60 days later.
    return coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('prospect', to_jsonb(pr),
        'first', (select to_jsonb(f) from public.outreach_messages f where f.prospect_id = pr.id and f.direction = 'out' and f.step = 0 and f.status = 'sent' limit 1)) as x
      from public.prospects pr
      where pr.reply_class = 'not_now' and pr.next_followup_at <= now() and pr.email is not null
        and not exists (select 1 from public.outreach_messages m where m.prospect_id = pr.id and m.direction = 'out' and m.step = 4)
        and not exists (select 1 from public.suppression_list s where s.email = lower(pr.email))
      limit p_limit) t), '[]'::jsonb);
  elsif p_kind = 'approved' then
    return coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('message', to_jsonb(m), 'prospect', to_jsonb(pr),
        'thread', (select jsonb_build_object('message_id', f.message_id, 'subject', f.subject) from public.outreach_messages f
                   where f.prospect_id = pr.id and f.direction = 'out' and f.step = 0 and f.status = 'sent' limit 1)) as x
      from public.outreach_messages m join public.prospects pr on pr.id = m.prospect_id
      where m.status = 'approved' and m.direction = 'out' and m.kind = 'email'
        and (
          (m.step <= 2 and pr.status in ('audited', 'emailed') and (pr.snooze_until is null or pr.snooze_until < now()))
          or (m.step >= 3 and pr.status not in ('unsubscribed', 'bounced', 'lost', 'won'))
        )
        and not exists (select 1 from public.suppression_list s where s.email = lower(pr.email))
      order by m.step desc, pr.lead_score desc nulls last, m.approved_at nulls last, m.created_at
      limit p_limit) t), '[]'::jsonb);
  elsif p_kind = 'sent_ids' then
    return coalesce((select jsonb_agg(jsonb_build_object('message_id', m.message_id, 'prospect_id', m.prospect_id, 'email', lower(pr.email), 'name', pr.name)) from public.outreach_messages m
      join public.prospects pr on pr.id = m.prospect_id
      where m.direction = 'out' and m.status = 'sent' and m.message_id is not null and m.sent_at > now() - interval '120 days'), '[]'::jsonb);
  end if;
  raise exception 'Unknown list %', p_kind;
end;
$$;

-- ---------- Admin stats: totals, per niche, per subject variant ----------
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
    'positive', (select count(*) from firsts where reply_class in ('interested', 'question')),
    'bounces', (select count(*) from firsts where bounced),
    'suppressed', (select count(*) from public.suppression_list),
    'by_niche', coalesce((select jsonb_agg(jsonb_build_object('key', business_type, 'sent', n, 'replies', r, 'positive', pos) order by n desc) from (
      select business_type, count(*) as n, count(*) filter (where replied) as r, count(*) filter (where reply_class in ('interested', 'question')) as pos
      from firsts group by business_type) t), '[]'::jsonb),
    'by_variant', coalesce((select jsonb_agg(jsonb_build_object('key', coalesce(variant, '-'), 'sent', n, 'replies', r, 'positive', pos) order by variant) from (
      select variant, count(*) as n, count(*) filter (where replied) as r, count(*) filter (where reply_class in ('interested', 'question')) as pos
      from firsts group by variant) t), '[]'::jsonb),
    'tabs', jsonb_build_object(
      'ready', (select count(*) from public.outreach_messages where direction = 'out' and status = 'draft'),
      'sent', (select count(*) from public.outreach_messages where direction = 'out' and status = 'sent'),
      'hot', (select count(*) from public.prospects where reply_class in ('interested', 'question') and status not in ('won', 'lost')),
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
    'public.app_ox_domain_emailed(text, text, uuid)',
    'public.app_admin_outreach_stats(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;
