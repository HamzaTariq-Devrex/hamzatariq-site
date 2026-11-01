# Writing rules for hamzatariq.site posts

Every blog post follows these rules. `npm run content:check` enforces the ones marked **(checked)**; a post that fails is not published.

## Who we write for

Business owners, founders and recruiters who want a fast website, a dashboard or an AI chatbot, or whose React site doesn't show up on Google. Most are not developers. Write so a busy owner understands it on a phone.

## Shape of a post

- **Answer first.** The first 2–3 lines answer the question in the title. No warm-up, no history lesson.
- **Length:** 1300–2000 words of prose; code blocks don't count. **(checked)**
- **Headings:** 5–8 H2s (`##`), each one a clear question or step. H3s are fine inside them. **(checked)**
- **"From my work" box:** at least one `<FromMyWork>` block with a real example from Hamza's projects. **(checked)**
- **FAQ:** 4–5 questions in the frontmatter `faq` list. They render at the end of the post with FAQPage schema. **(checked)**
- **CTA:** comes from the post's category (`content/blog-categories.json`) and links to the matching service page or `/hire`. Don't add a second sales block. **(checked: the category must have one)**

## Real facts only

- Numbers come only from `content/owner/` (profile, projects), `src/data/caseStudies.ts`, `src/data/services.ts` and `src/data/experience.ts`. **(checked: any other number fails)**
- Facts we can use today: SEO score 83 → 100 and mobile LCP 18.0 s → 2.6 s on hamzatariq.site, performance 35 → 66 (home), 85 → 97 (/work), 88 → 99 (project pages), 31 pre-rendered project pages, 45+ brands at Devrex Digital, prices and delivery times from the profile table, project terms (50/50 payment, 2 revision rounds, 30 days of free fixes), the AI assistant facts (44 pages embedded, 30 saved answers, 20 free replies a day, first token in 1–2 s).
- Never invent clients, quotes, testimonials, results or statistics. If a post needs a fact we don't have, leave it out or add a `TODO(owner)` to `OWNER_TODO.md` and wait.
- Outside facts (how Google renders JavaScript, what Core Web Vitals are) need a link to the source and no made-up numbers.

## SEO

- **One main keyword per post**, used in: the title, the slug, the first paragraph and at least one H2. **(checked)**
- A keyword is never used twice: not by another post, a service page or a tool page. **(checked)**
- `<title>` (the `seoTitle`, or `title` when it fits) plus " | Hamza Tariq" is 60 characters or less. **(checked)**
- Meta description (`description`) is 150–160 characters and says what the reader gets. **(checked)**
- **Links:** 3+ internal links, including one to a service page, `/hire` or a tool; 1–2 links to trusted outside sources (Google Search Central, web.dev, official docs). No broken links. **(checked)**
- Every image has alt text that describes it. Use `<Figure src alt width height caption />`. **(checked)**

## Voice

- First person ("I", "my team at Devrex Digital"). Plain, friendly, direct.
- Short sentences and short paragraphs (1–3 sentences). One idea per paragraph.
- Simple words. Explain any technical term in half a sentence the first time.
- Concrete over clever: say what to do, what it costs, how long it takes.
- **Banned filler** (checked): "in today's digital world/age", "in today's fast-paced", "in the ever-evolving", "ever-changing landscape", "unlock the power", "unleash", "look no further", "game-changer", "delve", "dive deep", "deep dive", "elevate your", "it's important to note", "in conclusion", "navigating the", "tapestry", "embark", "cutting-edge", "revolutionize", "supercharge", "seamless", "harness the power", "at the end of the day", "without further ado", "a testament to".

## Frontmatter

```yaml
---
title: "Why Your React Website Is Not Ranking on Google" # H1
seoTitle: "React Website Not Ranking on Google? Fix It" # optional, when title + suffix > 60
description: "150–160 characters."
keyword: "react website not ranking on google"
category: react-nextjs-seo # nextjs-websites | dashboards | ai-chatbots | react-nextjs-seo | hiring
tags: [react, seo, next.js]
published: 2026-11-02 # posts appear on this date (Pakistan time)
updated: 2026-11-20 # optional
cover: { src: /images/..., alt: "...", width: 1600, height: 900 } # optional
faq:
  - q: "Question?"
    a: "Answer in 1–3 sentences."
---
```

## Pace

At most one post every 2 days, so max 4 per ISO week (by `published` date). **(checked)** The autopilot dates each post 2 days after the latest one and skips a run when the next free date is more than 2 days away.
