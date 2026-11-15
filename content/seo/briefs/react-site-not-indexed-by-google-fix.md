# Brief: react site not indexed by google fix

- Post: /blog/react-site-not-indexed-by-google-fix
- Keyword: react site not indexed by google fix
- Cluster: react-seo (supporting, pillar: /blog/react-seo-guide)
- Intent: fix · Funnel: consideration
- Secondary: crawled currently not indexed react, google not indexing react pages, discovered not indexed fix, request indexing google search console
- Researched: 2026-11-15 (web search, US results; the search tool doesn't show Google's "People also ask" box, so the questions below come from the top results' headings, forum threads in the results and related searches)

## Search intent

Fix. The searcher owns or runs a React site, opened Google Search Console and found pages under "Not indexed" (or found nothing with a `site:` search). They want to know which status means what, what to change, and how to get the pages indexed again. They expect the fix first, as steps, then the reasons.

## Top results

1. [Search Engine Land: How to fix technical SEO issues on client-side React apps](https://searchengineland.com/how-to-fix-technical-seo-issues-on-client-side-react-apps-455124): built around one audit where a faulty router created placeholder URLs that ended up "Discovered, currently not indexed". Covers CSR vs SSR, SPA routing, a catch-all NotFound route, redirects and moving to Next.js. Developer-level.
2. [John Kavanagh: JavaScript pages crawled but not indexed](https://johnkavanagh.co.uk/articles/why-javascript-pages-are-crawled-but-not-indexed/): the best debugging order (status code, canonical, robots meta, raw vs rendered HTML, metadata changing after load, internal links, thin content). Treats only "Crawled but not indexed"; assumes developer tools knowledge.
3. [DEV: How I fixed canonical and indexing issues on my React SPA](https://dev.to/sujit_chanda_223531a0bf06/how-i-fixed-canonical-indexing-issues-on-my-react-spa-cloudflare-pages-custom-domain-p3g): one site where www and non-www were both live, so Google chose its own canonical. Fix: host redirect, canonical tag, cache purge, request indexing. No results shown.
4. [DEV: Why Google can't see your React app](https://dev.to/mitudas/why-google-cant-see-your-react-app-ndp): empty HTML shell, SSR, react-snap, react-helmet-async, a build-time package from the author. No Search Console statuses at all.

## What they miss

- None maps each Search Console status to the React cause behind it. Each result covers one status (or none) from one site.
- None covers soft 404s from SPA catch-all routing: an unknown URL answers with status 200 and the same shell, so Google flags real pages and junk URLs alike. Search Engine Land recommends a NotFound component but never says the server must send a real 404 status.
- None says how long indexing takes or what "Request indexing" does and doesn't do; two give unsourced "second wave" timings.
- None is written for a non-developer owner who only has Search Console open.
- None tells the reader when patching a SPA stops being worth it, or what the fix costs.

## Questions to answer

- Why does Google say crawled but not indexed?
- How long does Google take to index a new page?
- Why are my React pages discovered but not indexed?
- What does soft 404 or duplicate canonical mean on a React site?
- Does Request indexing in Google Search Console fix it?
- When is moving to Next.js worth it for indexing?

## Our angle

A status-by-status map: find your status in the Page indexing report, read the React cause next to it, apply the matching fix, then validate. Written for an owner with Search Console open, from the checks I run in my SEO audits and the Search Console and sitemap setup I do in my React and Next.js SEO service.

## Unique additions

- A table mapping each Search Console status (Crawled, Discovered, Duplicate/canonical, Soft 404, noindex, redirect/404 in sitemap) to its usual React cause and fix.
- A numbered 6-step fix that works from Search Console alone (find status → URL Inspection raw HTML → fix → clean sitemap → validate/request → watch).
- The soft 404 trap from SPA catch-all routing, explained in plain words.
- Honest timing from Google's own documentation, without invented day counts, and what Request indexing can and can't do.
- Real prices for the audit, the setup and the migration.

## Information gain

- Practical asset: the status-to-fix table and a numbered 6-step fix (also HowTo schema).
- Labelled opinion: `<MyTake>` on when to stop patching and move to Next.js.
- `<FromMyWork>`: what my free SEO audit tool checks for indexing (status 200, noindex in the meta tag and the X-Robots-Tag header, canonical, sitemap, content in the raw HTML), and the Search Console setup in my SEO service.

## Sources to link

- Google: [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) (soft 404s in SPAs, rendering)
- Google: [Ask Google to recrawl your URLs](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) (timing, request indexing)
- Google: [Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- Next.js: [not-found file convention](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)
