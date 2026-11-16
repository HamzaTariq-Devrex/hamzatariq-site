-- Outreach fixes (owner, 2026-11-17):
-- 1. Bounce guard for small numbers: app_ox_state also returns bounces_24h (since the last resume).
-- 2. The bounce reason (SMTP status + diagnostic) is kept on the suppression list.
-- 3. Strong sites (audit 70+) are held for the SEO + blog offer: new prospect status 'held'.

-- ---------- 2. Bounce reason on the suppression list ----------
alter table public.suppression_list add column if not exists detail text check (char_length(detail) <= 500);

-- ---------- 3. Held prospects ----------
alter table public.prospects drop constraint prospects_status_check;
alter table public.prospects add constraint prospects_status_check check (status in
  ('found', 'audited', 'skipped', 'waiting', 'held', 'whatsapp', 'messaged', 'emailed', 'replied', 'call', 'won', 'lost', 'unsubscribed', 'bounced'));

-- Email 1 drafts already queued or in "Needs a look" for a site scoring 70+ are cancelled and the
-- business is held (never a "no website" prospect: those have no audit score).
with strong as (
  select p.id from public.prospects p
  where p.audit_score >= 70 and p.status = 'audited'
    and exists (select 1 from public.outreach_messages m where m.prospect_id = p.id and m.direction = 'out' and m.step = 0 and m.status in ('draft', 'approved', 'review'))
    and not exists (select 1 from public.outreach_messages m where m.prospect_id = p.id and m.direction = 'out' and m.status = 'sent')
)
, cancelled as (
  update public.outreach_messages m set status = 'cancelled', error = 'Held: strong site (audit 70+), waiting for the SEO + blog offer'
  from strong s where m.prospect_id = s.id and m.direction = 'out' and m.status in ('draft', 'approved', 'review')
  returning m.prospect_id
)
update public.prospects p set status = 'held', skip_reason = 'Strong site (audit ' || p.audit_score || '): waiting for the SEO + blog offer', updated_at = now()
where p.id in (select id from strong);

-- ---------- 2. Stop with a reason ----------
drop function if exists public.app_ox_stop(text, text, text, uuid);
create or replace function public.app_ox_stop(p_secret text, p_email text, p_reason text, p_prospect uuid default null, p_detail text default null)
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
    insert into public.suppression_list (email, reason, prospect_id, detail) values (v_email, p_reason, p_prospect, left(nullif(p_detail, ''), 500))
    on conflict (email) do update set detail = coalesce(public.suppression_list.detail, excluded.detail);
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

revoke execute on function public.app_ox_stop(text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.app_ox_stop(text, text, text, uuid, text) to anon;

-- ---------- 1. Bounce guard counters ----------
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
    'bounces_24h', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'bounce' and created_at > greatest(now() - interval '24 hours', v_since)),
    'complaints_7d', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'complaint' and created_at > greatest(now() - interval '7 days', v_since)),
    'last50_sent', (select count(*) from last50),
    'last50_bounces', (select count(*) from last50 l where exists (
      select 1 from public.outreach_messages b where b.prospect_id = l.prospect_id and b.direction = 'in' and b.kind = 'bounce' and b.created_at >= l.sent_at)),
    'found_24h', (select count(*) from public.prospects where created_at > now() - interval '24 hours')
  ) into v;
  return v;
end;
$$;

-- The bounce that triggered the first auto-pause: keep its reason (read from the bounce email).
update public.suppression_list set detail = '550 5.7.1 High probability of spam (mx1.krystal.uk): rejected by the receiving spam filter; the address and mail server exist'
where email = 'info@didsbury-jewellers.uk' and detail is null;
