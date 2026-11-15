-- Outreach, round 2 (owner, 2026-11-16):
-- - "WhatsApp manually" queue: businesses with a phone but no public email get status 'whatsapp';
--   Hamza sends the prefilled message himself and marks them 'messaged'.
-- - Earlier "no public email" skips that have a phone go back through qualification.
-- - The saved searches Hamza asked for (7 types x 7 cities, no US).
-- - app_ox_delete_draft: "Redraft" removes an unsent draft so a new one can be written.

alter table public.prospects drop constraint prospects_status_check;
alter table public.prospects add constraint prospects_status_check check (status in
  ('found', 'audited', 'skipped', 'whatsapp', 'messaged', 'emailed', 'replied', 'call', 'won', 'lost', 'unsubscribed', 'bounced'));

update public.prospects
set status = 'found', skip_reason = null, updated_at = now()
where status = 'skipped'
  and skip_reason in ('No public email', 'No website and no public email')
  and coalesce(phone, '') <> '';

insert into public.outreach_searches (business_type, city, country)
select t.business_type, c.city, c.country
from (values ('jewellery'), ('clothing'), ('bridal'), ('dentist'), ('beauty'), ('restaurant'), ('estate-agent')) as t (business_type)
cross join (values ('London', 'GB'), ('Manchester', 'GB'), ('Birmingham', 'GB'), ('Dubai', 'AE'), ('Toronto', 'CA'), ('Sydney', 'AU'), ('Melbourne', 'AU')) as c (city, country)
where not exists (
  select 1 from public.outreach_searches s
  where s.business_type = t.business_type and lower(s.city) = lower(c.city) and s.country = c.country
);

-- No US searches until a postal address is set (CAN-SPAM).
update public.outreach_searches set active = false where country = 'US';

create or replace function public.app_ox_delete_draft(p_secret text, p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prospect uuid;
begin
  perform private.check_secret(p_secret);
  delete from public.outreach_messages where id = p_id and status = 'draft' and direction = 'out'
  returning prospect_id into v_prospect;
  return v_prospect;
end;
$$;

revoke execute on function public.app_ox_delete_draft(text, uuid) from public, anon, authenticated;
grant execute on function public.app_ox_delete_draft(text, uuid) to anon;
