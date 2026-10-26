-- Admin dashboard: private notes on leads (owner-editable) and an optional WhatsApp number from the lead form.

alter table public.leads
  add column notes text check (char_length(notes) <= 4000),
  add column phone text check (char_length(phone) <= 40);

-- The owner may change a lead's status and notes, nothing else (RLS policy "Owner updates leads" already applies).
revoke update on public.leads from authenticated;
grant update (status, notes) on public.leads to authenticated;

-- app_create_lead gains p_phone; drop the old signature so calls are never ambiguous.
drop function public.app_create_lead(text, text, text, text, text, text, text, text, uuid);

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
  p_phone text default null
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
  insert into public.leads (name, email, project_type, budget, message, source, page, session_id, phone)
  values (trim(p_name), lower(trim(p_email)), nullif(trim(p_project_type), ''), nullif(trim(p_budget), ''),
          nullif(trim(p_message), ''), p_source, left(p_page, 200), v_session, nullif(trim(p_phone), ''))
  returning id into v_id;
  insert into public.events (name, page, session_id, data)
  values ('lead_submitted', left(p_page, 200), v_session, jsonb_build_object('source', p_source, 'lead_id', v_id));
  return v_id;
end;
$$;

revoke execute on function public.app_create_lead(text, text, text, text, text, text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.app_create_lead(text, text, text, text, text, text, text, text, uuid, text) to anon;
