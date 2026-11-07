# Writing rules for hamzatariq.site posts

Every blog post follows these rules. `npm run content:check` enforces the ones marked **(checked)**; a post that fails is not published. The keyword and cluster strategy is in `content/seo/strategy.md`.

The bar: a reader who has already read the top 5 Google results should still learn something here, faster. Nothing generic.

## Who we write for

Business owners, founders and recruiters who want a fast website, a dashboard or an AI chatbot, or whose React site doesn't show up on Google. Most are not developers. Write so a busy owner understands it on a phone.

## Before writing: SERP research and the brief

Every post starts with a brief at `content/seo/briefs/<slug>.md`. **(checked for posts from 2026-11-06)**

1. Search the web for the primary keyword. Read the top results (open at least 3) and collect "People also ask" and related questions. If the search tool doesn't show People Also Ask, say so in the brief and take questions from the top results' headings and related searches.
2. Write the brief:

```markdown
# Brief: <primary keyword>

- Post: /blog/<slug>
- Keyword: <primary keyword>
- Cluster: <id> (pillar or supporting, pillar: /blog/<pillar-slug>)
- Intent: <intent> · Funnel: <stage>
- Secondary: <secondary keywords>
- Researched: YYYY-MM-DD (how: tool, region, any limits)

## Search intent
What the searcher wants and what they expect to see first.

## Top results
1. [Title](https://url): what it covers. (3+ results with URLs)

## What they miss
- What they all miss or get wrong. (2+ points)

## Questions to answer
- Question? (4+; each gets its own H2 or FAQ item)

## Our angle
The one thing this post says that the top results don't.

## Unique additions
- Things none of the top results have. (2+)

## Information gain
Which kinds this post uses (see below).

## Original data
(only when audit data is used)
- Query: <the query from audit-stats.mjs>
- Queried: YYYY-MM-DD
- Sites: N (30+)

## Sources to link
Official docs or other primary sources.
```

3. The post covers everything the top results cover that the reader needs, **better and shorter**, plus at least 2 things none of them have. Never copy or paraphrase their text; write from Hamza's own work.

## Shape of a post

- **Answer first.** The first 100 words answer the query directly, in a form Google can use as a featured snippet. The primary keyword is in the first paragraph and the first 100 words. **(checked)** No warm-up: generic openers ("In this article", "Are you looking for", "Have you ever", "Whether you're", "When it comes to") fail. **(checked)**
- **Snippet block near the top:** a short list, table or bold definition ("**X** is …") before the second H2. **(checked)**
- **Length:** supporting posts 1,300–2,000 words of prose; pillars 2,500–3,500. Code blocks don't count. **(checked)**
- **Headings:** supporting posts 5–8 H2s, pillars 8–14. One H2 per question; at least 2 question-style H2s (3 for pillars), taken from the brief's questions and People Also Ask where natural. **(checked)** Every question in the brief gets an H2 or an FAQ item. **(checked: most of them; the rest warn)** No generic headings ("Introduction", "Conclusion", "Final thoughts", "Wrapping up", "Overview"). **(checked)**
- **Search intent match** **(checked)**:
  - `hire`: lead with what to look for (one of the first 3 H2s), and include an H2 on cost and one on red flags.
  - `buy`: a real price in the first 100 words.
  - `compare`: the verdict in the first 100 words and a comparison table before the third H2.
  - `fix`: lead with the fix in the first 100 words; causes and theory after.
  - `learn`: the definition, list or table near the top does the job.
- **FAQ:** 4–5 questions in the frontmatter `faq` list, rendered with FAQPage schema. **(checked)**
- **CTA:** comes from the post's category (`content/blog-categories.json`). Don't add a second sales block. **(checked: the category must have one)**

## Information gain (at least 2 kinds per post, real data only)

**(checked for posts from 2026-11-06)**

| Kind | How to add it | Counted when |
| --- | --- | --- |
| Real example with screenshots | `<FromMyWork>` box with a `<Figure>` of a real project or case study | The box contains a `<Figure>` or image |
| Client review | `<Review id="…" />` from `content/testimonials.json`, linked to the client | The id exists (none yet: only the owner adds reviews) |
| Original data | Aggregate, anonymised stats from the free SEO audit tool: run `node scripts/autopilot/audit-stats.mjs`, use only its numbers, copy query, date and site count into the brief's "Original data" section, and say in the post how many sites it covers ("Of the 41 sites checked with my audit tool, …") | The brief has 30+ sites and the post names the site count. Skip until `usable` is true |
| Practical asset | Working code, a checklist (`- [ ]`), a decision or cost table from real prices, or a numbered step-by-step fix (4+ steps) | Any of these appears |
| Labelled opinion | `<MyTake>` box ("What I recommend to clients") | The box appears |

Every post still needs at least one `<FromMyWork>` box. **(checked)**

## Real facts only (E-E-A-T)

- Numbers come only from `content/owner/` (profile, projects), `src/data/caseStudies.ts`, `src/data/services.ts`, `src/data/experience.ts`, and the brief's live audit query. **(checked: any other number fails, in the body, title, description, FAQ, trust line and HowTo)**
- Facts we can use today: SEO score 83 → 100 and mobile LCP 18.0 s → 2.6 s on hamzatariq.site, performance 35 → 66 (home), 85 → 97 (/work), 88 → 99 (project pages), 31 pre-rendered project pages, 45+ brands at Devrex Digital, 40+ live production websites, prices and delivery times from the profile table, project terms (50/50 payment, 2 revision rounds, 30 days of free fixes), the AI assistant facts (44 pages embedded, 30 saved answers, 20 free replies a day, first token in 1–2 s).
- Never invent clients, quotes, testimonials, results or statistics. Never claim a result Hamza hasn't had. If a post needs a fact we don't have, block the topic (`blockedBy` in the backlog, question in `OWNER_TODO.md`).
- "Studies show", "research shows", "experts say", "statistics show" and similar need a link to the real source **in the same sentence**. **(checked)** Outside facts (how Google renders JavaScript, what Core Web Vitals are) link to the source and use no made-up numbers.
- **Trust line:** frontmatter `trust` is one sentence, "Why trust this guide", with real credentials that fit the topic (for example: "I built and run the assistant on this site…"). It shows under the byline. **(checked for posts from 2026-11-06)**
- The byline shows the author photo, "Founder of Devrex Digital", and "Last updated" (the `updated` date, or `published`). The author box at the end links to /about, /hire, GitHub and, once real reviews exist, /reviews.

## Keywords

- **One primary keyword per post**, used in: the title (near the start, within the first 4 words), the slug, the meta description, the first paragraph, the first 100 words and at least one H2. **(checked)**
- A primary keyword is never used twice: not by another post, a service page, a tool page or an industry page. **(checked)**
- **Secondary keywords** (3–6 in frontmatter `secondary`, from the backlog item): at least 3 of them appear naturally in the text, headings or FAQ. **(checked)** None may be another page's primary keyword. **(checked)**
- **No stuffing:** the primary keyword takes at most 2.5% of the words, each secondary at most 1.5%. **(checked)** Write for the reader; if a sentence only exists to hold a keyword, delete it.

## On-page

- `<title>` (the `seoTitle`, or `title` when it fits) plus " | Hamza Tariq" is 60 characters or less, with the keyword near the start and a specific benefit or number (cost, fix, checklist, steps, vs, a real number). **(checked)** No clickbait: no "!", "ultimate", "secret", "you won't believe", "hacks". **(checked)**
- Meta description (`description`) is 150–160 characters, contains the keyword and gives a reason to click (what the reader gets that others don't). **(checked: length, keyword)**
- **Images:** every image has descriptive alt text (4+ words saying what it shows; not "screenshot" or "image"). **(checked)** Local images must exist, be WebP or AVIF and weigh 250 KB or less. **(checked; non-WebP warns)** Use `<Figure src alt width height caption />`. Every post gets its own OG image automatically (`src/app/blog/[slug]/opengraph-image.tsx`). **(checked: route exists)**
- **Schema (automatic):** BlogPosting (author and publisher = the Person `@id`, datePublished, dateModified), FAQPage, BreadcrumbList. Add `howto` frontmatter only for a real step-by-step procedure (3+ steps, numbers checked) to get HowTo schema:

```yaml
howto:
  name: "Migrate a Vite React site to Next.js"
  steps:
    - name: "Move pages into the App Router"
      text: "One or two sentences."
```

## Links

- 3+ internal links, including one to a service page, `/hire` or a tool; 1–2 links to trusted outside sources (Google Search Central, web.dev, official docs). No broken links. **(checked)**
- Cluster links: supporting posts link to the pillar, 2 sibling posts and the cluster's service page. **(checked)** The autopilot adds links to each new post from 2–3 older related posts. **(checked: 2+)**
- **Descriptive anchor text** that says where the link goes ("my [Vite React to Next.js migration](/blog/…)"). Never "here", "click here", "this post", "read more", "learn more". **(checked)**

## Voice

- First person ("I", "my team at Devrex Digital"). Plain, friendly, direct.
- Short sentences and short paragraphs (1–3 sentences). One idea per paragraph.
- Simple words. Explain any technical term in half a sentence the first time.
- Concrete over clever: say what to do, what it costs, how long it takes.
- **No repetition:** a sentence that appears twice, or two paragraphs that make the same point, fail. **(checked)** Each section must add something; cut any section a reader would find in every other article on the topic (the brief's "What they miss" tells you what's worth the space).
- **No list without examples:** every list item says something specific (a price, a step, a real case), not a generic tip.
- **Banned filler** (checked; single words in any form): "in today's digital world/age/world", "in today's fast-paced", "in the ever-evolving", "ever-changing", "it's no secret", "look no further", "game-changer", "dive deep", "deep dive", "dive into", "it's important to note", "it's worth noting", "in conclusion", "to sum up", "navigating the", "tapestry", "cutting-edge", "harness the power", "at the end of the day", "without further ado", "a testament to", "when it comes to", "take it to the next level", "plays a crucial/vital role", "in the realm of", "one-stop shop", "best-in-class", "world-class", "state-of-the-art", "needless to say", "rest assured", and the words unlock, unleash, delve, elevate, seamless, robust, landscape, embark, revolutionize, supercharge, leverage, empower, synergy, paradigm, holistic, utilize, myriad, plethora, bespoke.

## Frontmatter

```yaml
---
title: "Why Your React Website Is Not Ranking on Google" # H1
seoTitle: "React Website Not Ranking on Google? Fix It" # optional, when title + suffix > 60
description: "150–160 characters, with the keyword and a reason to click."
keyword: "react website not ranking on google"
category: react-nextjs-seo # nextjs-websites | dashboards | ai-chatbots | react-nextjs-seo | hiring
cluster: react-seo # content/seo/clusters.json
role: supporting # pillar only for the cluster's pillar slug
intent: fix # hire | buy | compare | learn | fix
funnel: consideration # awareness | consideration | decision
secondary: ["react seo", "single page react app", "server-side rendering"] # 3–6
trust: "One sentence with real credentials for this topic."
tags: [react, seo, next.js]
published: 2026-11-02 # posts appear on this date (Pakistan time)
updated: 2026-11-20 # optional; shown as "Last updated"
cover: { src: /images/..., alt: "...", width: 1600, height: 900 } # optional
howto: { name: "...", steps: [{ name: "...", text: "..." }] } # optional, real step-by-step only
faq:
  - q: "Question?"
    a: "Answer in 1–3 sentences."
---
```

Posts published before 2026-11-06 must meet the brief, trust-line, information-gain and incoming-link rules at their next monthly refresh (the missing brief shows as a warning until then). Every other rule applies to them already.

## Pace

Up to 3 posts per publish day, publish days at least 2 days apart, max 12 per ISO week (by `published` date). **(checked)**

- Posts on the same day are in **different clusters** and answer **clearly different questions**. **(checked)**
- A post fails when its title or one of its question H2s is too similar to a post published in the 14 days before it (or earlier the same day): content-word overlap of 0.5+ for titles, 0.6+ for a question H2. **(checked)**
- The autopilot fills the latest publish day first (up to 3 slots), then moves to the next day 2+ days later, and skips a run when the next free date is more than 2 days away. Every quality rule in this file applies to each post, however many go out that day.
