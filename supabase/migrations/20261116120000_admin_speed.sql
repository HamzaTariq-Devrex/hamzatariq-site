-- Faster /admin (owner, 2026-11-16): indexes for every filter and sort the admin uses, and one
-- function per page that does the counting and grouping in Postgres, so each page needs one call
-- instead of fetching rows and counting in JavaScript. Pakistan time decides "today" and "this week".
-- The pages check the owner session first; these functions are called server-side with the server
-- secret (like every app_* function), which also lets the overview be cached for 60 seconds.

-- ---------- Indexes ----------
create index if not exists leads_status_idx on public.leads (status, created_at desc);
create index if not exists leads_source_idx on public.leads (source, created_at desc);
create index if not exists leads_session_idx on public.leads (session_id) where session_id is not null;
create index if not exists leads_project_type_idx on public.leads (project_type);
create index if not exists chat_sessions_created_idx on public.chat_sessions (created_at desc);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at);
create index if not exists chat_messages_role_created_idx on public.chat_messages (role, created_at);
create index if not exists prospects_created_idx on public.prospects (created_at desc);
create index if not exists prospects_score_idx on public.prospects (lead_score desc nulls last, created_at desc);
create index if not exists outreach_messages_kind_idx on public.outreach_messages (direction, kind, created_at);
create index if not exists outreach_messages_sent_idx on public.outreach_messages (sent_at) where status = 'sent';
create index if not exists outreach_searches_run_idx on public.outreach_searches (last_run_at nulls first);
-- outreach_settings.next_send_at needs no index: the table has exactly one row.

-- ---------- /admin overview ----------
create or replace function public.app_admin_overview(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today timestamptz := (date_trunc('day', now() at time zone 'Asia/Karachi')) at time zone 'Asia/Karachi';
  v_tomorrow timestamptz := v_today + interval '1 day';
  v_30 timestamptz := v_tomorrow - interval '30 days';
  v_60 timestamptz := v_tomorrow - interval '60 days';
  v jsonb;
begin
  perform private.check_secret(p_secret);
  select jsonb_build_object(
    'leads_total', (select count(*) from public.leads),
    'won_total', (select count(*) from public.leads where status = 'won'),
    'leads_30', (select count(*) from public.leads where created_at >= v_30 and created_at < v_tomorrow),
    'won_30', (select count(*) from public.leads where status = 'won' and created_at >= v_30 and created_at < v_tomorrow),
    'leads_prev30', (select count(*) from public.leads where created_at >= v_60 and created_at < v_30),
    'won_prev30', (select count(*) from public.leads where status = 'won' and created_at >= v_60 and created_at < v_30),
    'week', (select count(*) from public.leads where created_at >= v_tomorrow - interval '7 days' and created_at < v_tomorrow),
    'prev_week', (select count(*) from public.leads where created_at >= v_tomorrow - interval '14 days' and created_at < v_tomorrow - interval '7 days'),
    'chats_today', (select count(*) from public.chat_sessions where created_at >= v_today and created_at < v_tomorrow),
    'chats_yesterday', (select count(*) from public.chat_sessions where created_at >= v_today - interval '1 day' and created_at < v_today),
    'chats_week', (select count(*) from public.chat_sessions where created_at >= v_tomorrow - interval '7 days' and created_at < v_tomorrow),
    'chats_prev_week', (select count(*) from public.chat_sessions where created_at >= v_tomorrow - interval '14 days' and created_at < v_tomorrow - interval '7 days'),
    'per_day', (
      select jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'count', coalesce(c.n, 0)) order by d.day)
      from generate_series((v_today at time zone 'Asia/Karachi')::date - 29, (v_today at time zone 'Asia/Karachi')::date, interval '1 day') as d (day)
      left join (
        select (created_at at time zone 'Asia/Karachi')::date as day, count(*) as n
        from public.leads where created_at >= v_30 group by 1
      ) c on c.day = d.day::date
    ),
    'by_source', coalesce((select jsonb_object_agg(source, n) from (select source, count(*) as n from public.leads group by source) s), '{}'::jsonb),
    'by_project_type', coalesce((select jsonb_agg(jsonb_build_object('project_type', project_type, 'count', n)) from (select project_type, count(*) as n from public.leads group by project_type) s), '[]'::jsonb),
    'events', coalesce((
      select jsonb_object_agg(name, jsonb_build_object('cur', cur, 'prev', prev)) from (
        select name,
               count(*) filter (where created_at >= v_30) as cur,
               count(*) filter (where created_at < v_30) as prev
        from public.events where created_at >= v_60 and created_at < v_tomorrow group by name
      ) e), '{}'::jsonb),
    'tools', coalesce((select jsonb_object_agg(tool, n) from (
      select data ->> 'tool' as tool, count(*) as n from public.events
      where name = 'tool_used' and created_at >= v_30 and data ? 'tool' group by 1) t), '{}'::jsonb),
    'cta', coalesce((select jsonb_object_agg(loc, n) from (
      select data ->> 'location' as loc, count(*) as n from public.events
      where name = 'audit_cta_click' and created_at >= v_30 and data ? 'location' group by 1) t), '{}'::jsonb),
    'outreach', jsonb_build_object(
      'found', (select count(*) from public.prospects where created_at >= v_30),
      'sent', (select count(*) from public.outreach_messages where direction = 'out' and status = 'sent' and created_at >= v_30),
      'replies', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'reply' and created_at >= v_30),
      'bounces', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'bounce' and created_at >= v_30),
      'unsubscribes', (select count(*) from public.outreach_messages where direction = 'in' and kind = 'unsubscribe' and created_at >= v_30)
    ),
    'latest', coalesce((select jsonb_agg(to_jsonb(l)) from (
      select id, name, project_type, source, status, created_at from public.leads order by created_at desc limit 5) l), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

-- ---------- /admin/chats ----------
-- Numbers and the top questions. p_off_topic and p_small_talk come from the code
-- (OFF_TOPIC_REPLY and the small-talk pattern), so the rule lives in one place.
create or replace function public.app_admin_chats(p_secret text, p_days integer, p_off_topic text, p_small_talk text)
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
  with pairs as (
    select m.content,
           lead(m.role) over w as next_role,
           lead(m.content) over w as reply,
           m.role
    from public.chat_messages m
    where m.created_at > now() - make_interval(days => greatest(p_days, 1))
    window w as (partition by m.session_id order by m.created_at, m.id)
  ), asked as (
    select trim(content) as wording,
           trim(regexp_replace(regexp_replace(lower(content), '[^[:alnum:]$ ]+', ' ', 'g'), '\s+', ' ', 'g')) as key
    from pairs
    where role = 'user'
      and not (next_role = 'assistant' and starts_with(coalesce(reply, ''), p_off_topic))
      and trim(content) <> ''
      and trim(content) !~* p_small_talk
  ), grouped as (
    select key, count(*) as n, mode() within group (order by wording) as wording
    from asked where key <> '' group by key order by n desc limit 20
  )
  select jsonb_build_object(
    'total_chats', (select count(*) from public.chat_sessions),
    'questions', (select count(*) from public.chat_messages where role = 'user'),
    'off_topic', (select count(*) from public.chat_messages where role = 'assistant' and starts_with(content, p_off_topic)),
    'saved', (select count(*) from public.chat_messages where role = 'assistant' and content like '%[offline:%'),
    'personal', (select count(*) from public.chat_messages where role = 'assistant' and content like '%[offline:personal]%'),
    'top', coalesce((select jsonb_agg(jsonb_build_object('text', wording, 'count', n) order by n desc) from grouped), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

-- One page of chat sessions with their first question and lead, newest first.
create or replace function public.app_admin_chat_sessions(p_secret text, p_offset integer, p_limit integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return coalesce((
    select jsonb_agg(x order by x ->> 'created_at' desc) from (
      select jsonb_build_object(
        'id', s.id, 'created_at', s.created_at, 'first_page', s.first_page, 'message_count', s.message_count,
        'first_question', (select m.content from public.chat_messages m where m.session_id = s.id and m.role = 'user' order by m.created_at, m.id limit 1),
        'lead_id', (select l.id from public.leads l where l.session_id = s.id limit 1)
      ) as x
      from public.chat_sessions s
      order by s.created_at desc
      offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 100)
    ) t), '[]'::jsonb);
end;
$$;

-- ---------- /admin/prospects ----------
create or replace function public.app_admin_prospect_stats(p_secret text, p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_from timestamptz := ((v_today - (greatest(p_days, 1) - 1))::timestamp) at time zone 'Asia/Karachi';
  v jsonb;
begin
  perform private.check_secret(p_secret);
  select jsonb_build_object(
    'days', (
      select jsonb_agg(jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'found', (select count(*) from public.prospects p where (p.created_at at time zone 'Asia/Karachi')::date = d.day::date),
        'emailed', (select count(*) from public.outreach_messages m where m.status = 'sent' and m.direction = 'out' and (m.sent_at at time zone 'Asia/Karachi')::date = d.day::date),
        'replied', (select count(*) from public.outreach_messages m where m.direction = 'in' and m.kind = 'reply' and (m.created_at at time zone 'Asia/Karachi')::date = d.day::date),
        'bounced', (select count(*) from public.outreach_messages m where m.direction = 'in' and m.kind = 'bounce' and (m.created_at at time zone 'Asia/Karachi')::date = d.day::date),
        'unsubscribed', (select count(*) from public.outreach_messages m where m.direction = 'in' and m.kind = 'unsubscribe' and (m.created_at at time zone 'Asia/Karachi')::date = d.day::date)
      ) order by d.day desc)
      from generate_series(v_today - (greatest(p_days, 1) - 1), v_today, interval '1 day') as d (day)
    ),
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) as n from public.prospects group by status) s), '{}'::jsonb),
    'total', (select count(*) from public.prospects),
    'sent_24h', (select count(*) from public.outreach_messages where direction = 'out' and status = 'sent' and sent_at > now() - interval '24 hours'),
    'since', v_from
  ) into v;
  return v;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.app_admin_overview(text)',
    'public.app_admin_chats(text, integer, text, text)',
    'public.app_admin_chat_sessions(text, integer, integer)',
    'public.app_admin_prospect_stats(text, integer)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end;
$$;
