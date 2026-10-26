-- Core schema for hamzatariq.site: leads, chat history, events and pgvector site content.
-- Every table has RLS enabled. Public (anon) access goes only through SECURITY DEFINER functions
-- that check the server secret; the owner reads data through Supabase Auth (see policies below).

create extension if not exists vector with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.app_config (
  key text primary key,
  value text not null
);

-- ---------- Tables ----------

create table public.chat_sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  first_page text check (char_length(first_page) <= 200),
  ip_hash text check (char_length(ip_hash) <= 64),
  user_agent text check (char_length(user_agent) <= 300),
  message_count integer not null default 0
);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 6000),
  page text check (char_length(page) <= 200),
  created_at timestamptz not null default now()
);
create index chat_messages_session_idx on public.chat_messages (session_id, created_at);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  project_type text check (char_length(project_type) <= 80),
  budget text check (char_length(budget) <= 60),
  message text check (char_length(message) <= 4000),
  source text not null check (source in ('chatbot', 'form', 'tool', 'page')),
  page text check (char_length(page) <= 200),
  session_id uuid references public.chat_sessions (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'replied', 'won', 'lost')),
  notified_at timestamptz
);
create index leads_created_idx on public.leads (created_at desc);

create table public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) <= 60),
  page text check (char_length(page) <= 200),
  session_id uuid,
  data jsonb not null default '{}'::jsonb
);
create index events_name_created_idx on public.events (name, created_at desc);

create table public.site_chunks (
  id bigint generated always as identity primary key,
  url text not null,
  title text not null,
  chunk_index integer not null,
  content text not null,
  content_hash text not null,
  embedding extensions.vector(768) not null,
  updated_at timestamptz not null default now(),
  unique (url, chunk_index)
);
create index site_chunks_embedding_idx on public.site_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.leads enable row level security;
alter table public.events enable row level security;
alter table public.site_chunks enable row level security;

-- ---------- Owner access (Supabase Auth) ----------

create or replace function public.is_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'email') = 'hamzabuildsweb@gmail.com', false)
$$;

create policy "Owner reads leads" on public.leads for select to authenticated using ((select public.is_owner()));
create policy "Owner updates leads" on public.leads for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "Owner reads chat sessions" on public.chat_sessions for select to authenticated using ((select public.is_owner()));
create policy "Owner reads chat messages" on public.chat_messages for select to authenticated using ((select public.is_owner()));
create policy "Owner reads events" on public.events for select to authenticated using ((select public.is_owner()));

-- The owner may only change a lead's status.
revoke update on public.leads from authenticated;
grant update (status) on public.leads to authenticated;

-- Only the owner email can create an account.
create or replace function private.only_owner_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) <> 'hamzabuildsweb@gmail.com' then
    raise exception 'Sign-ups are disabled';
  end if;
  return new;
end;
$$;

create trigger only_owner_signup
  before insert on auth.users
  for each row execute function private.only_owner_signup();

-- ---------- Server-side API (anon key + server secret) ----------

create or replace function private.check_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from
     (select value from private.app_config where key = 'server_secret_sha256') then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.app_chat_recent_count(p_secret text, p_ip_hash text, p_minutes integer default 10)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return (
    select count(*)::integer
    from public.chat_messages m
    join public.chat_sessions s on s.id = m.session_id
    where s.ip_hash = p_ip_hash
      and m.role = 'user'
      and m.created_at > now() - make_interval(mins => greatest(p_minutes, 1))
  );
end;
$$;

create or replace function public.app_log_chat(
  p_secret text,
  p_session uuid,
  p_page text,
  p_ip_hash text,
  p_user_agent text,
  p_user_message text,
  p_assistant_message text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_new boolean;
begin
  perform private.check_secret(p_secret);
  insert into public.chat_sessions (id, first_page, ip_hash, user_agent)
  values (p_session, left(p_page, 200), left(p_ip_hash, 64), left(p_user_agent, 300))
  on conflict (id) do nothing;
  v_new := found;

  insert into public.chat_messages (session_id, role, content, page)
  values (p_session, 'user', left(p_user_message, 6000), left(p_page, 200)),
         (p_session, 'assistant', left(p_assistant_message, 6000), left(p_page, 200));

  update public.chat_sessions
     set message_count = message_count + 2, last_message_at = now()
   where id = p_session
  returning message_count into v_count;

  if v_new then
    insert into public.events (name, page, session_id) values ('chat_started', left(p_page, 200), p_session);
  end if;
  return v_count;
end;
$$;

create or replace function public.app_create_lead(
  p_secret text,
  p_name text,
  p_email text,
  p_project_type text,
  p_budget text,
  p_message text,
  p_source text,
  p_page text,
  p_session uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_session uuid;
begin
  perform private.check_secret(p_secret);
  select id into v_session from public.chat_sessions where id = p_session;
  insert into public.leads (name, email, project_type, budget, message, source, page, session_id)
  values (trim(p_name), lower(trim(p_email)), nullif(trim(p_project_type), ''), nullif(trim(p_budget), ''),
          nullif(trim(p_message), ''), p_source, left(p_page, 200), v_session)
  returning id into v_id;
  insert into public.events (name, page, session_id, data)
  values ('lead_submitted', left(p_page, 200), v_session, jsonb_build_object('source', p_source, 'lead_id', v_id));
  return v_id;
end;
$$;

create or replace function public.app_log_event(p_secret text, p_name text, p_page text, p_session uuid, p_data jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  insert into public.events (name, page, session_id, data)
  values (left(p_name, 60), left(p_page, 200), p_session, coalesce(p_data, '{}'::jsonb));
end;
$$;

create or replace function public.app_match_chunks(p_secret text, p_embedding extensions.vector(768), p_count integer default 6)
returns table (url text, title text, content text, similarity double precision)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return query
    select c.url, c.title, c.content, 1 - (c.embedding operator(extensions.<=>) p_embedding) as similarity
    from public.site_chunks c
    order by c.embedding operator(extensions.<=>) p_embedding
    limit least(greatest(p_count, 1), 12);
end;
$$;

create or replace function public.app_chunk_hashes(p_secret text)
returns table (url text, hashes text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return query
    select c.url, string_agg(c.content_hash, ',' order by c.chunk_index)
    from public.site_chunks c
    group by c.url;
end;
$$;

-- Replaces all chunks for one URL. p_chunks: [{ "content": text, "hash": text, "embedding": [768 floats] }]
create or replace function public.app_replace_chunks(p_secret text, p_url text, p_title text, p_chunks jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  delete from public.site_chunks where url = p_url;
  insert into public.site_chunks (url, title, chunk_index, content, content_hash, embedding)
  select p_url, left(p_title, 300), (c.ordinality - 1)::integer, c.value ->> 'content', c.value ->> 'hash',
         (c.value ->> 'embedding')::extensions.vector(768)
  from jsonb_array_elements(p_chunks) with ordinality as c;
  return jsonb_array_length(p_chunks);
end;
$$;

create or replace function public.app_prune_chunks(p_secret text, p_keep_urls text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  perform private.check_secret(p_secret);
  delete from public.site_chunks where not (url = any (p_keep_urls));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function
  public.app_chat_recent_count(text, text, integer),
  public.app_log_chat(text, uuid, text, text, text, text, text),
  public.app_create_lead(text, text, text, text, text, text, text, text, uuid),
  public.app_log_event(text, text, text, uuid, jsonb),
  public.app_match_chunks(text, extensions.vector, integer),
  public.app_chunk_hashes(text),
  public.app_replace_chunks(text, text, text, jsonb),
  public.app_prune_chunks(text, text[])
to anon;
