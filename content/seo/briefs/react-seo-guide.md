# Brief: react seo guide

- Post: /blog/react-seo-guide
- Keyword: react seo guide
- Cluster: react-seo (pillar, pillar: /blog/react-seo-guide)
- Intent: learn · Funnel: awareness
- Secondary: react seo, next.js seo, seo for single page applications, react seo best practices, technical seo for react
- Researched: 2026-11-13 (web search, US results; the search tool doesn't show Google's "People also ask" box, so the questions below come from the top results' headings, their FAQ sections and related searches)

## Search intent

Learn. The searcher has (or is planning) a React site and has heard React is "bad for SEO". They want to know whether that's true, what exactly goes wrong, and what to do about it, in order. Founders want a clear answer and a plan; developers want the concrete setup (rendering, metadata, sitemap, structured data, Core Web Vitals). They expect a direct verdict first, then a list of fixes.

## Top results

1. [UXPin: React SEO, 10 proven techniques](https://www.uxpin.com/studio/blog/react-seo/): a list of ten techniques (SSR, semantic HTML, URLs, meta tags, structured data, Core Web Vitals), ending in a product promo. Uses Pages Router code; no checks a non-developer can run.
2. [freeCodeCamp: How to make React apps SEO-friendly](https://www.freecodecamp.org/news/how-to-make-seo-friendly-react-apps/): beginner handbook with hand-built Express SSR, lazy loading, images, react-helmet metadata and JSON-LD. Lists First Input Delay as a Core Web Vital (replaced by INP), no sitemap or robots.txt.
3. [Focus Reactive: How to make a React website SEO-friendly](https://focusreactive.com/blog/the-ultimate-guide-to-seo-for-react-applications-in-2026/): the strongest result. Frames React SEO as "where does the HTML get built", covers AI crawlers and link previews, metadata in server HTML, `generateMetadata`, how to check what crawlers see. No measured results; a placeholder for a real case was published empty.
4. [LinkGraph: SEO for React applications](https://linkgraph.com/blog/seo-for-react-applications/): very long agency guide (SSR, SSG/ISR, dynamic rendering code, router fixes, Core Web Vitals, testing, frameworks). Its "case study" numbers are labelled a scenario with no source; presents dynamic rendering with prerender code as a fallback.

## What they miss

- No result shows measured before/after numbers from a real React site that was fixed. LinkGraph's "case study" is a hypothetical scenario.
- None puts the fixes in a clear order of impact for someone with limited budget; they list ten or more techniques with equal weight.
- react-helmet is still recommended (freeCodeCamp, LinkGraph) without saying it only changes the title after JavaScript runs, so the raw HTML keeps one generic title.
- Dynamic rendering and prerender services are presented as normal options; Google itself calls dynamic rendering a workaround, not a long-term solution.
- Only one result gives checks a non-developer can run in a few minutes, and none prices the work.
- Keeping heavy browser-only features (3D, scroll animations) working after moving to server rendering is not covered.

## Questions to answer

- Is React bad for SEO?
- How do I make a React app SEO friendly?
- Does Google index JavaScript sites?
- Is Next.js good for SEO?
- Is react-helmet enough for SEO?
- What does it cost to fix SEO on a React site?

## Our angle

The hub for the cluster: React itself is fine, client-side rendering is the problem. The fixes in the order of impact I actually work in, the checks an owner can run without a developer, and the measured results of doing it on my own site (SEO 83 to 100, LCP 18.0 s to 2.6 s), linking every supporting post.

## Unique additions

- Measured before/after table from my own site, with a screenshot of the home page that kept its 3D character.
- Fixes ranked by impact, with what each one changes for Google, other crawlers and visitors.
- A decision table: client-side SPA, prerender service, static generation, server rendering, with when each fits.
- Real prices and delivery times for an audit, a technical setup and a migration.
- A copyable checklist and the working Next.js code for metadata and the sitemap from this site's pattern.

## Information gain

- Example with screenshot: the home page after the migration, in the results box.
- Practical asset: working Next.js code, a decision table, a checklist and a cost table from real prices.
- Labelled opinion: "What I recommend to clients" on patching versus migrating.

## Sources to link

- [Google Search Central: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Search Central: Dynamic rendering as a workaround](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)
- [Next.js: generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
