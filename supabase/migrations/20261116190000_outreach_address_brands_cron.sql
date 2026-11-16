-- Outreach, round 4 (owner, 2026-11-16):
-- 1. "waiting" status: US and Canadian prospects wait until OUTREACH_POSTAL_ADDRESS is set
--    (CAN-SPAM and CASL require a mailing address). Queued Canadian/US drafts are removed.
-- 2. Big-brand filter helpers: name counts across all searches, skip + remove drafts in one call,
--    and the list of not-yet-emailed prospects to re-check.
-- 3. Scheduling: pg_cron + pg_net call /api/outreach/tick every 5 minutes. The CRON_SECRET bearer
--    is read from Supabase Vault (secret "outreach_cron_secret"); it is set with
--    app_ox_set_cron_secret() from the server, never written in a migration.
-- 4. outreach_settings.last_tick_at for the "Last tick" time in /admin/prospects.

-- ---------- 1. Waiting for a postal address ----------
alter table public.prospects drop constraint prospects_status_check;
alter table public.prospects add constraint prospects_status_check check (status in
  ('found', 'audited', 'skipped', 'waiting', 'whatsapp', 'messaged', 'emailed', 'replied', 'call', 'won', 'lost', 'unsubscribed', 'bounced'));

delete from public.outreach_messages m
using public.prospects p
where p.id = m.prospect_id and p.country in ('US', 'CA') and m.direction = 'out' and m.status in ('draft', 'approved');

update public.prospects p
set status = 'waiting', skip_reason = 'Waiting for a postal address (CAN-SPAM / CASL)', updated_at = now()
where p.country in ('US', 'CA') and p.status in ('found', 'audited', 'whatsapp')
  and not exists (select 1 from public.outreach_messages m where m.prospect_id = p.id and m.direction = 'out' and m.status = 'sent');

-- Once the address is set, waiting prospects go back through qualification.
create or replace function public.app_ox_release_waiting(p_secret text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  perform private.check_secret(p_secret);
  update public.prospects set status = 'found', skip_reason = null, updated_at = now() where status = 'waiting';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------- 2. Big-brand helpers ----------
-- How many prospects (any search, any city) share this business name.
create or replace function public.app_ox_name_count(p_secret text, p_name text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return (select count(*) from public.prospects where lower(trim(name)) = lower(trim(p_name)));
end;
$$;

-- Skips a prospect and removes its unsent drafts (never touches anything already sent).
create or replace function public.app_ox_skip(p_secret text, p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  delete from public.outreach_messages where prospect_id = p_id and direction = 'out' and status in ('draft', 'approved');
  update public.prospects set status = 'skipped', skip_reason = left(p_reason, 200), updated_at = now()
  where id = p_id and status in ('found', 'audited', 'whatsapp', 'waiting');
end;
$$;

-- Not-yet-emailed prospects in the queue, for re-checking with the brand filter.
create or replace function public.app_ox_recheck_list(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'website', p.website, 'osm_tags', p.osm_tags, 'status', p.status,
                     'name_count', (select count(*) from public.prospects q where lower(trim(q.name)) = lower(trim(p.name)))))
    from public.prospects p
    where p.status in ('found', 'audited', 'whatsapp', 'waiting')
      and not exists (select 1 from public.outreach_messages m where m.prospect_id = p.id and m.direction = 'out' and m.status = 'sent')
  ), '[]'::jsonb);
end;
$$;

-- ---------- 3. Scheduling with pg_cron + pg_net, secret in Vault ----------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Stores (or replaces) the tick's bearer secret in Vault. Called from the server with the server secret.
create or replace function public.app_ox_set_cron_secret(p_secret text, p_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.check_secret(p_secret);
  if coalesce(length(p_value), 0) < 16 then raise exception 'Secret too short'; end if;
  select id into v_id from vault.secrets where name = 'outreach_cron_secret';
  if v_id is null then
    perform vault.create_secret(p_value, 'outreach_cron_secret', 'Bearer secret for /api/outreach/tick (pg_cron)');
  else
    perform vault.update_secret(v_id, p_value);
  end if;
end;
$$;

-- True when the Vault secret exists (the value is never returned).
create or replace function public.app_ox_cron_status(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return jsonb_build_object(
    'secret_set', exists (select 1 from vault.secrets where name = 'outreach_cron_secret'),
    'job', (select jsonb_build_object('schedule', schedule, 'active', active) from cron.job where jobname = 'outreach-tick')
  );
end;
$$;

-- The job reads the secret from Vault at run time. Without the secret it does nothing.
select cron.unschedule('outreach-tick') where exists (select 1 from cron.job where jobname = 'outreach-tick');
select cron.schedule(
  'outreach-tick',
  '*/5 * * * *',
  $job$
  select net.http_get(
    url := 'https://hamzatariq.site/api/outreach/tick',
    headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
    timeout_milliseconds := 60000
  )
  from vault.decrypted_secrets s
  where s.name = 'outreach_cron_secret';
  $job$
);

-- ---------- 4. Last tick ----------
alter table public.outreach_settings add column if not exists last_tick_at timestamptz;

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
    updated_at = now()
  where id = 1;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.app_ox_release_waiting(text)',
    'public.app_ox_name_count(text, text)',
    'public.app_ox_skip(text, uuid, text)',
    'public.app_ox_recheck_list(text)',
    'public.app_ox_set_cron_secret(text, text)',
    'public.app_ox_cron_status(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;
