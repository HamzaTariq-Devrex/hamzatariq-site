-- One prospect with its latest audit and its whole email thread (server side: hot-reply handling,
-- check-backs and the owner alert). Server secret required, like every app_* function.
create or replace function public.app_ox_prospect(p_secret text, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return (
    select jsonb_build_object(
      'prospect', to_jsonb(p),
      'audit', (select to_jsonb(a) from public.prospect_audits a where a.prospect_id = p.id order by a.created_at desc limit 1),
      'thread', coalesce((select jsonb_agg(jsonb_build_object('direction', m.direction, 'kind', m.kind, 'step', m.step, 'status', m.status, 'subject', m.subject,
                 'body', m.body, 'message_id', m.message_id, 'sent_at', m.sent_at, 'created_at', m.created_at) order by m.created_at)
                 from public.outreach_messages m where m.prospect_id = p.id and (m.direction = 'in' or m.status = 'sent')), '[]'::jsonb)
    )
    from public.prospects p where p.id = p_id
  );
end;
$$;

revoke execute on function public.app_ox_prospect(text, uuid) from public, anon, authenticated;
grant execute on function public.app_ox_prospect(text, uuid) to anon;
