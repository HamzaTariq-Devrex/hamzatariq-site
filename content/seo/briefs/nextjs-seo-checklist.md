# Brief: next.js seo checklist

- Post: /blog/nextjs-seo-checklist
- Keyword: next.js seo checklist
- Cluster: react-seo (supporting, pillar: /blog/react-seo-guide)
- Intent: learn · Funnel: consideration
- Secondary: next.js metadata api, next.js seo best practices, next.js sitemap, next.js canonical url
- Researched: 2026-11-19 (web search, US results; the search tool doesn't show Google's "People also ask" box, so the questions below come from the top results' headings, their FAQ sections and related searches such as "does next.js generate a sitemap app router")

## Search intent

Learn. The searcher is a founder with a Next.js site (or a developer building one for them) who wants a list to work through before launch or after a drop in traffic. They expect the checklist itself near the top, then the code for each item, and a way to confirm each one works.

## Top results

1. [Wisp: SEO Checklist for Next.js with App Router](https://wisp.blog/blog/seo-checklist-for-nextjs-with-app-router): rendering strategy, meta tags, JSON-LD, images, `sitemap.ts`, Core Web Vitals, OG images. Says "App Router" but its meta, canonical and JSON-LD examples use `next/head` (a Pages Router API) and it still lists FID. No way to test each item.
2. [Simplr (DEV): Next.js 15 App Router SEO Comprehensive Checklist](https://dev.to/simplr_sh/nextjs-15-app-router-seo-comprehensive-checklist-3d3f): 27 items with why/how. Sitemap through the `next-sitemap` package inside a route handler (the author isn't sure it works), robots as a route handler instead of `robots.ts`, `next/head` in App Router code, middleware in the wrong folder. No Metadata API.
3. [John Kavanagh: Technical SEO Audit Checklist for React and Next.js](https://johnkavanagh.co.uk/resources/react-nextjs-technical-seo-audit-checklist/): 14 audit areas, each with "how to validate it" (URL Inspection, Rich Results Test, view source vs rendered DOM). Strong on testing, but no code and no Next.js file conventions.
4. [Rehan Haider (DEV): Next.js 16 Production SEO Checklist, 12 Things](https://dev.to/rehan_haider_e481fe9617f0/nextjs-16-production-seo-checklist-12-things-i-check-before-every-deploy-1ne4): mistakes found in production (robots on staging, broken sitemaps, double canonicals, font shift, image priority). Its `generateMetadata` example has broken quotes, and it never shows `sitemap.ts`, `robots.ts`, `opengraph-image` or JSON-LD.
5. [Vercel: How do I generate a sitemap for my Next.js app?](https://vercel.com/support/articles/how-do-i-generate-a-sitemap-for-my-nextjs-app-on-vercel): now redirects to the Next.js `sitemap` file convention docs.

## What they miss

- No result gives both the current App Router code for each item and a way to test it. The ones with code still use `next/head` or third-party sitemap packages; the one with tests has no code.
- None mentions `metadataBase`, so relative Open Graph and canonical URLs break, or that `params` is a Promise in `generateMetadata` since Next.js 15.
- None escapes JSON-LD before putting it in a `<script>` tag (a `<` in a product name or review can break out of the tag).
- None shows how to keep preview/staging deploys out of Google from code (`robots.ts` reading the environment), only the warning.
- None says plainly that a page whose main content is fetched in the browser is still an empty page to crawlers, even in Next.js.

## Questions to answer

- How do I add SEO to Next.js? (Metadata API, `generateMetadata`)
- Does Next.js generate a sitemap?
- How do I set a canonical URL in Next.js?
- How do I test each item before launch?
- Do I still need next-seo or next-sitemap?
- How do I stop preview deploys from being indexed?

## Our angle

The backlog angle said "taken from this site's codebase"; the owner's own site can't be featured, so the code is presented as the patterns I use in client builds, without naming the site. Sharpened angle: 20 items, each with the App Router code (no `next/head`, no extra packages) and a test you can run in a minute, so a non-developer can check their developer's work.

## Unique additions

- A test for every item (view source, `curl -I`, Rich Results Test, URL Inspection) in one table.
- `metadataBase`, the Promise `params` in Next.js 15, and the JSON-LD `<` escape.
- `robots.ts` that blocks every non-production deploy.
- Real starting prices for having it done (SEO audit, technical SEO setup).

## Information gain

- Practical asset: a `- [ ]` checklist of 20 items with working App Router code and a test table.
- Real example with screenshots: `<FromMyWork>` with the Nagina Jewels store figure (large catalogue, so every category page needs its own title, canonical and sitemap entry).
- Labelled opinion: `<MyTake>` on next-seo / next-sitemap.

## Sources to link

- [Next.js Metadata docs](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js sitemap file convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Google: Consolidate duplicate URLs (canonical)](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
