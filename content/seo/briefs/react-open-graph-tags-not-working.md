# Brief: react open graph tags not working

- Post: /blog/react-open-graph-tags-not-working
- Keyword: react open graph tags not working
- Cluster: react-seo (supporting, pillar: /blog/react-seo-guide)
- Intent: fix · Funnel: awareness
- Secondary: og tags react, whatsapp link preview not showing, react helmet og tags, next.js opengraph image
- Researched: 2026-11-27 (web search, US results; the search tool doesn't show Google's "People also ask" box, so the questions below come from the top results' headings, forum threads in the results and related searches such as "whatsapp link preview not showing og:image" and "do social media crawlers run javascript"). Next.js behaviour checked in the installed `next@15.5` source (`html-bots.js`, `resolve-url.js`).

## Search intent

Fix. Someone shared a link to their React site in WhatsApp, Slack, LinkedIn or X and got no image, the wrong title or no card at all, even though the tags are "in the code" (usually set with react-helmet). They want the reason and the fix first, then a way to check it worked. Many are founders who just see the broken preview; some are developers.

## Top results

1. [Open Graph React SEO: Why React App Looks Broken on Twitter (DEV)](https://dev.to/mitudas/open-graph-react-seo-why-react-app-looks-broken-on-twitter-and-how-to-fix-it-34o): client-rendered apps whose helmet tags crawlers never see; fixes with an Express server that fills placeholders in index.html and a generated image. No WhatsApp, no redirects or status codes, recommends an X validator another result calls retired, promotes a package.
2. [Link Preview Not Showing? Fix It on WhatsApp, X & LinkedIn (DEV)](https://dev.to/ctrlzed/link-preview-not-showing-fix-it-on-whatsapp-x-linkedin-1l25): five causes (missing image, relative URL, cache, JS-rendered tags, redirect chains); per-platform refresh tools and a `?v=2` query string. Some WhatsApp claims (no SVG, no plain HTTP) aren't in Meta's own documentation; no React or Next.js specifics.
3. [OG Tags Not Working: Complete Fix Guide (Wild & Free Tools)](https://wildandfreetools.com/blog/og-tags-not-working-complete-fix/): missing tags, tags in the wrong place, image problems, JS-rendered tags, caching. Generic; no WhatsApp; conflicting image-size advice; ad-heavy.
4. [Link Previews (Meta, WhatsApp Business docs)](https://developers.facebook.com/documentation/business-messaging/whatsapp/link-previews/): the authoritative WhatsApp rules: og:title, og:description, og:url, og:image in the head, the head within the first 300 KB of the page, absolute image URL under 600 KB and at least 300 px wide, a clean og:url, the crawler's user agent, and a check in the message composer.
5. [How search engines & social media crawlers render JavaScript (DEV, 2019)](https://dev.to/rachellcostello/how-search-engines-social-media-crawlers-render-javascript-438e): Google renders JS in a second wave; social crawlers generally don't; recommends prerendering or SSR. Old, no fix checklist, no WhatsApp.

## What they miss

- None says what happens after a React site moves to Next.js and previews still break: `metadataBase` not set (image URLs fall back to `localhost` or a preview deployment URL), or a preview deployment behind a login, so the crawler gets a login page instead of the image.
- None mentions WhatsApp's rule that the `<head>` must sit within the first 300 KB of the page, which large inline styles or scripts above the tags can break.
- None explains that a page's own `openGraph` object replaces the layout's, so a page that sets only a title loses the image set in the layout.
- None explains Next.js streaming metadata: browsers can get metadata streamed later, but WhatsApp, facebookexternalhit, Twitterbot, LinkedInBot and Slackbot are on Next.js's default "HTML-limited bots" list and get the tags in the `<head>` (checked in the installed Next.js source).
- None gives a founder a 2-minute check that doesn't need developer tools beyond "View page source".

## Questions to answer

- Why doesn't my link show a preview on WhatsApp?
- Do social crawlers run JavaScript?
- Does react-helmet work for OG tags?
- How do I set up Open Graph images in Next.js?
- How do I refresh a link preview that is cached?
- What size should an Open Graph image be?

## Our angle

The tags aren't broken, the crawler never runs your JavaScript, so the only fix that lasts is tags (and the image) in the server HTML of every page. Then the five Next.js-specific mistakes that still break previews after the move, and a quick check anyone can do.

## Unique additions

- The Next.js mistakes after a migration: missing `metadataBase`, page `openGraph` replacing the layout's, a protected preview deployment, a relative image URL, and a redirect on the image.
- WhatsApp's 300 KB head rule and what pushes tags past it.
- A copy-paste checklist for founders and a working `opengraph-image.tsx` example.
- Real prices for fixing it (SEO audit, technical SEO setup, migration).

## Information gain

- Real example with screenshot: `<FromMyWork>` with the Dulhahouse store (WhatsApp ordering, product links shared in chats).
- Practical asset: working code (`opengraph-image.tsx`, metadata) and a `- [ ]` checklist.
- Labelled opinion: `<MyTake>` on react-helmet vs moving to server-rendered pages.

## Sources to link

- [Next.js: opengraph-image and twitter-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- [Google Search Central: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
