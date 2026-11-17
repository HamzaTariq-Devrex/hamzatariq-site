-- Outreach offers (owner, 2026-11-18):
-- - priority: no-website and weak-website (audit under 50) businesses are drafted and emailed first;
-- - three offers, tracked apart: 'no-website' (free sample homepage), 'fixes' (quick fixes, audit
--   under 70) and 'content' (audit 70+: blog topics + the Monthly SEO + content service).

alter table public.prospects add column if not exists offer text;
alter table public.prospects drop constraint if exists prospects_offer_check;
alter table public.prospects add constraint prospects_offer_check check (offer in ('no-website', 'fixes', 'content'));
update public.prospects p set offer = case when p.website is null then 'no-website' when p.audit_score >= 70 then 'content' else 'fixes' end
where p.offer is null and exists (select 1 from public.outreach_messages m where m.prospect_id = p.id and m.direction = 'out' and m.step = 0);

-- 0 = no website, 1 = weak (under 50), 2 = 50-69, 3 = strong (70+) or unknown.
create or replace function public.ox_tier(p_website text, p_score integer)
returns integer
language sql
immutable
set search_path = ''
as $$ select case when p_website is null then 0 when p_score < 50 then 1 when p_score < 70 then 2 else 3 end $$;

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
    offer = case when p_patch ? 'offer' then p_patch ->> 'offer' else offer end,
    updated_at = now()
  where id = p_id;
end;
$$;

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
      order by public.ox_tier(pr.website, pr.audit_score), pr.lead_score desc nulls last, pr.created_at
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
    -- Replies first; then no-website and weak sites (owner, 2026-11-18); then the niche and the country with the fewest sends in the last 24 h; then the best lead.
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
      order by (m.step >= 3) desc, public.ox_tier(pr.website, pr.audit_score), coalesce(bn.n, 0), coalesce(bc.n, 0), m.step desc, pr.lead_score desc nulls last, m.created_at
      limit p_limit) t), '[]'::jsonb);
  elsif p_kind = 'sent_ids' then
    return coalesce((select jsonb_agg(jsonb_build_object('message_id', m.message_id, 'prospect_id', m.prospect_id, 'email', lower(pr.email), 'name', pr.name)) from public.outreach_messages m
      join public.prospects pr on pr.id = m.prospect_id
      where m.direction = 'out' and m.status = 'sent' and m.message_id is not null and m.sent_at > now() - interval '120 days'), '[]'::jsonb);
  end if;
  raise exception 'Unknown list %', p_kind;
end;
$$;

-- Per offer: drafted, sent, replied, positive (yes or price) since p_from.
create or replace function public.app_ox_offer_stats(p_secret text, p_from timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return coalesce((select jsonb_object_agg(offer, jsonb_build_object('drafted', drafted, 'sent', sent, 'replied', replied, 'positive', positive)) from (
    select pr.offer,
           count(*) filter (where m.created_at >= p_from) as drafted,
           count(*) filter (where m.status = 'sent' and m.sent_at >= p_from) as sent,
           count(*) filter (where m.status = 'sent' and m.sent_at >= p_from and pr.reply_class is not null and pr.reply_class not in ('bounce', 'out_of_office')) as replied,
           count(*) filter (where m.status = 'sent' and m.sent_at >= p_from and pr.reply_class in ('interested', 'price')) as positive
    from public.outreach_messages m join public.prospects pr on pr.id = m.prospect_id
    where m.direction = 'out' and m.step = 0 and pr.offer is not null
    group by pr.offer) t), '{}'::jsonb);
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.app_ox_update_prospect(text, uuid, jsonb)',
    'public.app_ox_list(text, text, integer)',
    'public.app_ox_offer_stats(text, timestamptz)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;
revoke execute on function public.ox_tier(text, integer) from public, anon, authenticated;
