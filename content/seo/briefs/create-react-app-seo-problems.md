# Brief: create react app seo problems

- Post: /blog/create-react-app-seo-problems
- Keyword: create react app seo problems
- Cluster: react-seo (supporting, pillar: /blog/react-seo-guide)
- Intent: fix · Funnel: consideration
- Secondary: cra seo, create react app meta tags, create react app prerender, create react app deprecated
- Researched: 2026-11-21 (web search, US results; the search tool doesn't show Google's "People also ask" box, so the questions below come from the top results' headings, their FAQ sections and related searches such as "create react app deprecated" and "create react app prerender")

## Search intent

Fix. A founder or a small team with an existing Create React App (CRA) site that isn't showing up properly on Google. They want to know what exactly is wrong, which fix to pick and what it costs, before anyone rewrites the site. They expect the fix first, not a lecture on rendering.

## Top results

1. [Fixing SEO problems for CRA (Medium, Stacked Q)](https://medium.com/@stackedq/fixing-seo-problems-for-cra-create-react-app-c47e62f13be): an Express server that swaps title and description placeholders in index.html per path. Old (pre-deprecation), title and description only, unknown paths still answer 200 with the shell.
2. [Is Create-React-App Good For SEO? (DEV, Taimoor Sattar)](https://dev.to/taimoorsattar7/is-create-react-app-good-for-seo-5ei): short; says CRA is weak because one index.html serves every route; suggests react-snap or react-snapshot. No word on whether those tools are maintained, no status codes, canonical or sitemap.
3. [React SEO Best Practices (Toptal)](https://www.toptal.com/react/react-seo-best-practices): long general React SEO guide (rendering strategies table, Core Web Vitals, helmet only alongside SSR, dynamic rendering deprecated by Google). Calls CRA largely unmaintained but gives no CRA-specific steps, no cost or decision guidance.
4. [Server-Side SEO for CRA without migrating to Next.js (DEV, Yogesh Gupta)](https://dev.to/yogeshykg/server-side-seo-for-cra-how-we-injected-dynamic-meta-tags-without-migrating-to-nextjs-2mkh): an Express proxy that injects meta tags from an SEO API. Only the head is fixed; the body is still an empty root div; no 404 handling.
5. [Sunsetting Create React App (react.dev)](https://react.dev/blog/2025/02/14/sunsetting-create-react-app): the React team's deprecation notice: CRA is in maintenance mode with no active maintainers; recommends a framework (Next.js, React Router, Expo) or a build tool (Vite, Parcel, Rsbuild); a callout says server rendering is not just for SEO.
6. [Migrating from Create React App (Next.js docs)](https://nextjs.org/docs/app/guides/migrating/from-create-react-app): step-by-step move into Next.js; the result is a client-only app (static export, the old App loaded with ssr: false).

## What they miss

- The developer posts fix only the `<head>` (title, description) and leave the body as an empty root div, and none handles the catch-all returning "OK" for pages that don't exist (soft 404s).
- None ranks the fixes by cost and effect, or says which fix fits which kind of site.
- None points out that the official Next.js migration guide, followed as written, still gives Google the same empty shell: it is step one, not the SEO fix.
- None says that moving CRA to Vite (the most common "CRA is deprecated" advice) changes nothing for SEO, because Vite still renders in the browser.
- None gives real prices.

## Questions to answer

- What are the SEO problems with a Create React App site? (H2)
- Is Create React App bad for SEO? (FAQ)
- How do I add meta tags to Create React App? (H2 on the helmet fix)
- Does prerendering fix CRA SEO? (H2)
- Does moving from Create React App to Vite fix SEO? (H2)
- Should I move Create React App to Next.js? (H2)
- What does fixing CRA SEO cost? (H2 / FAQ)

## Our angle

The fixes ranked by cost and effect for a business owner, with the two traps nobody mentions: moving to Vite doesn't help SEO, and the official Next.js migration guide stops at a client-only app, so "we migrated to Next.js" can still mean an empty page to Google. Plus when a migration isn't worth the money (pages behind a login, a site about to be redesigned).

## Unique additions

- A ranked fix table (helmet, prerender, Vite, Next.js client-only, Next.js server-rendered) with what each fixes and doesn't fix.
- The "Vite doesn't fix SEO" and "client-only Next.js still sends a shell" traps, with how to check for them with View page source.
- Real starting prices and delivery times from services.ts ($150 audit, $500 technical setup, $800 migration).

## Information gain

- Practical asset: ranked decision table with real prices, working react-helmet-async code, and a numbered check.
- Labelled opinion: `<MyTake>` on when not to migrate.
- Real example: `<FromMyWork>` with a screenshot of The Trekkerz Pakistan tour site (each tour and destination is a page people search for).

## Sources to link

- [Sunsetting Create React App (react.dev)](https://react.dev/blog/2025/02/14/sunsetting-create-react-app)
- [JavaScript SEO basics (Google Search Central)](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Dynamic rendering as a workaround (Google Search Central)](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)
- [Migrating from Create React App (Next.js docs)](https://nextjs.org/docs/app/guides/migrating/from-create-react-app)
