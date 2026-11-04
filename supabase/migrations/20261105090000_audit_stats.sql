-- Content autopilot: anonymised, aggregate results of the free SEO audit tool, for "original data"
-- in blog posts (content/STYLE.md). One row per site (its latest audit, by host), hamzatariq.site
-- excluded. Returns counts only: never URLs, hosts or IP hashes.

create or replace function public.app_audit_stats(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.check_secret(p_secret);
  with latest as (
    select distinct on (h.host) h.host, a.created_at, a.score, a.result
    from public.seo_audits a
    cross join lateral (
      select lower(regexp_replace(substring(coalesce(a.final_url, a.url) from '^[a-z]+://([^/:?#]+)'), '^www\.', '')) as host
    ) h
    where h.host is not null and h.host not in ('hamzatariq.site', 'localhost')
    order by h.host, a.created_at desc
  ),
  checks as (
    select c->>'id' as id, c->>'status' as status
    from latest l, jsonb_array_elements(l.result->'checks') c
  )
  select jsonb_build_object(
    'sites', (select count(*) from latest),
    'from', (select min(created_at) from latest),
    'to', (select max(created_at) from latest),
    'avgScore', (select round(avg(score)) from latest),
    'medianScore', (select percentile_cont(0.5) within group (order by score) from latest),
    'checks', coalesce((
      select jsonb_object_agg(id, counts)
      from (
        select id, jsonb_build_object(
          'pass', count(*) filter (where status = 'pass'),
          'warn', count(*) filter (where status = 'warn'),
          'fail', count(*) filter (where status = 'fail'),
          'skip', count(*) filter (where status = 'skip')
        ) as counts
        from checks group by id
      ) x
    ), '{}'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke execute on function public.app_audit_stats(text) from public, anon, authenticated;
grant execute on function public.app_audit_stats(text) to anon;
