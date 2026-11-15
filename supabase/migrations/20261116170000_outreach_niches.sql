-- Outreach v2 data (owner, 2026-11-16):
-- 1. Saved searches for every main small-business niche in the same 7 cities (no US).
-- 2. Unsent drafts written under the old rules ("Hi there", links in email 1) are removed; the
--    pipeline rewrites them with the new playbook.
-- 3. Prospects that were audited or queued for WhatsApp but never emailed are checked again, so they
--    get the contact-button check, the MX check and the mobile screenshot.

insert into public.outreach_searches (business_type, city, country)
select t.business_type, c.city, c.country
from (values ('clinic'), ('cafe'), ('hairdresser'), ('spa'), ('gym'), ('lawyer'), ('accountant'), ('guesthouse'),
             ('auto-repair'), ('home-services'), ('tutoring'), ('shop')) as t (business_type)
cross join (values ('London', 'GB'), ('Manchester', 'GB'), ('Birmingham', 'GB'), ('Dubai', 'AE'), ('Toronto', 'CA'), ('Sydney', 'AU'), ('Melbourne', 'AU')) as c (city, country)
where not exists (
  select 1 from public.outreach_searches s
  where s.business_type = t.business_type and lower(s.city) = lower(c.city) and s.country = c.country
);

delete from public.outreach_messages where status = 'draft' and direction = 'out';

update public.prospects p
set status = 'found', skip_reason = null, updated_at = now()
where p.status in ('audited', 'whatsapp')
  and not exists (select 1 from public.outreach_messages m where m.prospect_id = p.id and m.direction = 'out' and m.status = 'sent');
