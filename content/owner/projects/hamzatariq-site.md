# hamzatariq.site (own project)

- Client type: own portfolio and lead site.
- Live: https://hamzatariq.site
- Not shown as a case study or project (owner, November 2026): mention the results briefly as "on my own site" and link to `/services/react-nextjs-seo`, never to a case study page.
- Stack: Next.js 15 (App Router), React 19, TypeScript, GSAP, Three.js, Vercel.

## Problem

- Built as a Vite + React single-page app: every URL returned the same almost empty HTML; content rendered in the browser.
- One hard-coded title for all pages; no meta description, sitemap, robots.txt or structured data.
- Mobile home page LCP was 18.0 s (3D character and preloader).

## What was built

- Migration to Next.js 15 keeping the design, GSAP animations and 3D character.
- All pages pre-rendered, including 31 project pages.
- Unique titles and 150–160 character descriptions, canonical URLs, sitemap, robots.txt, JSON-LD.
- Generated OG images per page type, next/image, self-hosted Geist font.
- IndexNow submission after every production deploy.

## Results (mobile Lighthouse, local production build, 2026-10-22)

| Metric | Before | After |
| --- | --- | --- |
| SEO score, home | 83 | 100 |
| LCP, home | 18.0 s | 2.6 s |
| Performance, home | 35 | 66 |
| Performance, /work | 85 | 97 |
| Performance, project page | 88 | 99 |

## AI assistant "Hamza's AI" (built October 2026)

- Answers visitor questions only from this site's own content, on every page except the admin area.
- Stack: Google Gemini (gemini-3.5-flash for replies, gemini-embedding-001 embeddings with 768 dimensions), Supabase Postgres with pgvector for search, Next.js route handler that streams the reply.
- Content: 44 pages embedded at launch; pages are re-embedded automatically on every production deploy, and only changed pages are sent to Gemini again.
- Fallback: an offline answer bank of 30 saved answers (English and Roman Urdu phrasings) answers instantly when Gemini fails or its free quota runs out; questions it can't match get "Hamza will answer this personally" plus the lead form.
- Off-topic questions (coding help, trivia, jokes) get one fixed line instead of an answer.
- Lead capture inside the chat: name, email, project type, budget and an optional WhatsApp number, saved in Supabase with the chat transcript; an email notification to Hamza and an automatic reply to the visitor go out through Resend.
- Measured on the Gemini free tier (2026-10-26): the fast model allowed 20 replies per day; with minimal thinking it started replying in 1–2 s, while the free Flash-Lite models took 13–40 s per reply.
- Admin dashboard (/admin): leads, statuses, private notes, chat transcripts and the most asked questions.

## Testimonial

None (own project).
