-- Free SEO audit tool (cached results, rate limit, audit leads) and read-only data functions for the
-- content autopilot. RLS on every table; public access only through app_* functions that check the secret.

create table public.seo_audits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  url text not null check (char_length(url) <= 500),
  final_url text check (char_length(final_url) <= 500),
  score integer not null check (score between 0 and 100),
  result jsonb not null,
  ip_hash text check (char_length(ip_hash) <= 64)
);
create index seo_audits_url_created_idx on public.seo_audits (url, created_at desc);
create index seo_audits_ip_created_idx on public.seo_audits (ip_hash, created_at desc);

alter table public.seo_audits enable row level security;
create policy "Owner reads seo audits" on public.seo_audits for select to authenticated using ((select public.is_owner()));

-- Audit leads: new source and a link to the audit they asked for.
alter table public.leads drop constraint leads_source_check;
alter table public.leads add constraint leads_source_check check (source in ('chatbot', 'form', 'tool', 'page', 'seo-audit'));
alter table public.leads add column audit_id uuid references public.seo_audits (id) on delete set null;

drop function public.app_create_lead(text, text, text, text, text, text, text, text, uuid, text);

create function public.app_create_lead(
  p_secret text,
  p_name text,
  p_email text,
  p_project_type text,
  p_budget text,
  p_message text,
  p_source text,
  p_page text,
  p_session uuid,
  p_phone text default null,
  p_audit uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_session uuid;
  v_audit uuid;
begin
  perform private.check_secret(p_secret);
  select id into v_session from public.chat_sessions where id = p_session;
  select id into v_audit from public.seo_audits where id = p_audit;
  insert into public.leads (name, email, project_type, budget, message, source, page, session_id, phone, audit_id)
  values (trim(p_name), lower(trim(p_email)), nullif(trim(p_project_type), ''), nullif(trim(p_budget), ''),
          nullif(trim(p_message), ''), p_source, left(p_page, 200), v_session, nullif(trim(p_phone), ''), v_audit)
  returning id into v_id;
  insert into public.events (name, page, session_id, data)
  values ('lead_submitted', left(p_page, 200), v_session, jsonb_build_object('source', p_source, 'lead_id', v_id));
  return v_id;
end;
$$;

-- Latest audit of a URL from the last p_hours, or nothing.
create or replace function public.app_cached_audit(p_secret text, p_url text, p_hours integer default 24)
returns table (id uuid, created_at timestamptz, url text, final_url text, score integer, result jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return query
    select a.id, a.created_at, a.url, a.final_url, a.score, a.result
    from public.seo_audits a
    where a.url = p_url and a.created_at > now() - make_interval(hours => greatest(p_hours, 1))
    order by a.created_at desc
    limit 1;
end;
$$;

create or replace function public.app_get_audit(p_secret text, p_id uuid)
returns table (id uuid, created_at timestamptz, url text, final_url text, score integer, result jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return query select a.id, a.created_at, a.url, a.final_url, a.score, a.result from public.seo_audits a where a.id = p_id;
end;
$$;

create or replace function public.app_save_audit(p_secret text, p_url text, p_final_url text, p_score integer, p_result jsonb, p_ip_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.check_secret(p_secret);
  insert into public.seo_audits (url, final_url, score, result, ip_hash)
  values (left(p_url, 500), left(p_final_url, 500), greatest(0, least(100, p_score)), p_result, left(p_ip_hash, 64))
  returning id into v_id;
  insert into public.events (name, page, data)
  values ('seo_audit', '/tools/free-seo-audit', jsonb_build_object('audit_id', v_id, 'score', p_score));
  return v_id;
end;
$$;

-- Fresh audits run by one IP in the last p_minutes (cached answers are not counted).
create or replace function public.app_audit_recent_count(p_secret text, p_ip_hash text, p_minutes integer default 60)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return (
    select count(*)::integer from public.seo_audits
    where ip_hash = p_ip_hash and created_at > now() - make_interval(mins => greatest(p_minutes, 1))
  );
end;
$$;

-- Autopilot: what visitors ask the assistant most (declined off-topic questions excluded).
create or replace function public.app_top_questions(p_secret text, p_days integer default 90, p_limit integer default 50)
returns table (question text, asked integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return query
    with pairs as (
      select m.content as question,
             lead(m.content) over (partition by m.session_id order by m.created_at, m.id) as reply,
             m.role
      from public.chat_messages m
      where m.created_at > now() - make_interval(days => greatest(p_days, 1))
    )
    select lower(trim(p.question)) as question, count(*)::integer as asked
    from pairs p
    where p.role = 'user'
      and coalesce(p.reply, '') not like 'I can only help with questions about Hamza''s services and projects.%'
      and char_length(trim(p.question)) > 6
    group by lower(trim(p.question))
    order by asked desc
    limit least(greatest(p_limit, 1), 200);
end;
$$;

-- Autopilot monthly report: leads per source in a date range.
create or replace function public.app_leads_by_source(p_secret text, p_from timestamptz, p_to timestamptz)
returns table (source text, leads integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return query
    select l.source, count(*)::integer from public.leads l
    where l.created_at >= p_from and l.created_at < p_to
    group by l.source order by 2 desc;
end;
$$;

revoke execute on function
  public.app_create_lead(text, text, text, text, text, text, text, text, uuid, text, uuid),
  public.app_cached_audit(text, text, integer),
  public.app_get_audit(text, uuid),
  public.app_save_audit(text, text, text, integer, jsonb, text),
  public.app_audit_recent_count(text, text, integer),
  public.app_top_questions(text, integer, integer),
  public.app_leads_by_source(text, timestamptz, timestamptz)
from public, anon, authenticated;
grant execute on function
  public.app_create_lead(text, text, text, text, text, text, text, text, uuid, text, uuid),
  public.app_cached_audit(text, text, integer),
  public.app_get_audit(text, uuid),
  public.app_save_audit(text, text, text, integer, jsonb, text),
  public.app_audit_recent_count(text, text, integer),
  public.app_top_questions(text, integer, integer),
  public.app_leads_by_source(text, timestamptz, timestamptz)
to anon;
