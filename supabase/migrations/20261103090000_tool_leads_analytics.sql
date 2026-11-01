-- Phase 5 and 8: lead sources for the two new calculators, and the audit event renamed to the
-- analytics name used everywhere else (audit_run). RLS is unchanged (events and leads already have it).
alter table public.leads drop constraint leads_source_check;
alter table public.leads add constraint leads_source_check
  check (source in ('chatbot', 'form', 'tool', 'page', 'seo-audit', 'website-cost-calculator', 'chatbot-roi-calculator'));

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
  values ('audit_run', '/tools/free-seo-audit', jsonb_build_object('audit_id', v_id, 'score', p_score));
  return v_id;
end;
$$;

update public.events set name = 'audit_run' where name = 'seo_audit';

revoke execute on function public.app_save_audit(text, text, text, integer, jsonb, text) from public, anon, authenticated;
grant execute on function public.app_save_audit(text, text, text, integer, jsonb, text) to anon;
