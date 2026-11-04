# Brief: vite react to next.js migration

- Post: /blog/vite-react-to-nextjs-migration
- Keyword: vite react to next.js migration
- Cluster: react-seo (supporting, pillar: /blog/react-seo-guide)
- Intent: learn · Funnel: decision
- Secondary: migrate vite to next.js, react to next.js migration, vite vs next.js seo, convert react app to next.js
- Researched: 2026-11-05 (web search, US results; the search tool doesn't show Google's "People also ask" box, so the questions below come from the top results' headings and related searches)

## Search intent

Learn, close to a decision. The reader has a Vite (or Create React App) site, usually because it doesn't rank, and wants to know how the migration works, what breaks, how long it takes and whether it's worth it. Developers want the steps; founders want the outcome and the risk.

## Top results

1. [Next.js docs: Migrating from Vite (App Router)](https://nextjs.org/docs/app/guides/migrating/from-vite): official guide. Installs Next.js, adds a config with `output: 'export'`, moves `index.html` into a root layout and keeps the app as a client-side SPA behind a catch-all route, then suggests adopting features step by step.
2. [Next.js docs: Migrating from Vite (Pages Router)](https://nextjs.org/docs/pages/guides/migrating/from-vite): the same approach for the Pages Router.
3. [dev.to: Everything I wish I knew before migrating my first Vite project to Next.js](https://dev.to/digitaldev/everything-i-wish-i-knew-before-migrating-my-first-vite-project-to-nextjs-101m): `window is not defined`, `useEffect` guards, deleting react-router instead of shimming it.
4. [GeeksforGeeks: Next.js upgrading, migrating from Vite](https://geeksforgeeks.org/next-js-upgrading-migrating-from-vite): summary of the official steps.
5. [dev.to: Migrating a React.js project to Next.js](https://dev.to/apium_hub/migrating-react-js-project-to-next-js-391k): routing and `next/head` metadata in the Pages Router.

## What they miss

- The official guide's first stage keeps the site a client-rendered SPA. That gets you onto Next.js, but crawlers still get an empty page; none of the results say this stage alone does nothing for SEO.
- No result measures the outcome. There are no before/after SEO or LCP numbers from a real site.
- Nothing on keeping heavy browser-only features (3D, GSAP scroll effects) working after pre-rendering, beyond a generic `typeof window` guard.
- The SEO side of the switch (unique metadata per page, sitemap, robots.txt, structured data, keeping URLs, telling search engines after deploy) is barely covered.
- No result helps a non-developer decide whether the migration is worth paying for.

## Questions to answer

- How long does a Vite React to Next.js migration take?
- Will I lose my design or animations when moving to Next.js?
- Do my URLs change after the migration?
- Does the official Next.js migration guide fix SEO?
- Can I migrate a Create React App site the same way?
- Should I migrate my site or not?

## Our angle

A full migration of a live site with a 3D character and GSAP scroll effects, measured before and after on a production build, including the stage the official guide leaves out: turning the SPA into real pre-rendered HTML.

## Unique additions

- Measured results from my own site (SEO 83 to 100, LCP 18.0 s to 2.6 s, performance 35 to 66 home, 85 to 97 /work, 88 to 99 project pages) with a screenshot.
- Why the official SPA-first stage doesn't change what crawlers see, and what to do after it.
- How the 3D and animation layers were kept: `next/dynamic` with `ssr: false`, and full page loads in and out of the home page so their state doesn't leak.
- The real problems I hit, each with its fix.
- A seven-step migration plan anyone can copy, and the real price.

## Information gain

- Example with screenshot: the home page after the migration, inside the results box.
- Practical asset: working code, the results table and the migration plan.
- Labelled opinion: "What I recommend to clients" on SPA-first versus a full migration.

## Sources to link

- [Next.js: Migrating from Vite](https://nextjs.org/docs/app/guides/migrating/from-vite) (official guide).
