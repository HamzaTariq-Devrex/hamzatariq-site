-- SEO Command Center fixes after the first real sync (2026-11-16):
-- 1. A link counts as broken only after failing on two separate checks (local DNS hiccups made
--    working client sites look dead). Failed links are re-checked after a day, not a week.
-- 2. Removes fix rows created from those false link failures, the backlog topic made from a client's
--    brand name (navigational query for its /work page), and per-page approval fixes for
--    "URL is unknown to Google" (a discovery problem, kept as an opportunity instead).
alter table public.seo_links add column if not exists fail_count integer not null default 0;

create or replace function public.app_seo_save_links(p_secret text, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  update public.seo_links l set status = r.status, error = r.error, checked_at = now(),
    fail_count = case when r.status is null or r.status >= 400 then l.fail_count + 1 else 0 end
  from jsonb_to_recordset(p_rows) as r (url text, status integer, error text) where l.url = r.url;
end;
$$;

create or replace function public.app_seo_links_due(p_secret text, p_limit integer)
returns setof text language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return query select url from public.seo_links
    where checked_at is null or checked_at < now() - interval '7 days' or (fail_count > 0 and checked_at < now() - interval '20 hours')
    order by checked_at nulls first limit p_limit;
end;
$$;

delete from public.seo_fixes where status in ('auto', 'waiting') and (
  key like 'broken-outside-link:%'
  or key = 'backlog-add:the mark by strokes'
  or (key like 'index:%' and data ->> 'state' ilike '%unknown to google%'));
