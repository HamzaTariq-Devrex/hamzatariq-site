-- Marks a lead as notified once the owner notification email has been sent.

create or replace function public.app_mark_lead_notified(p_secret text, p_lead uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  update public.leads set notified_at = now() where id = p_lead and notified_at is null;
end;
$$;

revoke execute on function public.app_mark_lead_notified(text, uuid) from public, anon, authenticated;
grant execute on function public.app_mark_lead_notified(text, uuid) to anon;
