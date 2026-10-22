# hamzatariq.site — Autopilot Inbound Growth Plan

> Give this file to Claude Code. Put it in the repo root, then say:
> "Read PLAN.md. Start with Phase 0. Do not move to the next phase until I approve."

---

## 1. Context

- **Owner:** Hamza Tariq, freelance developer.
- **Domain:** https://hamzatariq.site (existing Next.js portfolio: about, projects, photos, contact).
- **Services:** custom-coded React/Next.js websites, admin/business dashboards, AI chatbots.
- **Goal:** clients and job offers come to the site on their own through Google, with no manual outreach.
- **Target:** 5+ qualified leads per month within 6 months.
- **Hard rule:** the owner does almost nothing day to day. Everything that can be automated must be automated. The owner only supplies real facts once (see Section 9).

## Stack decision

**Supabase is the main backend for everything dynamic.** Do not add another database or auth provider.

| Need | Supabase feature |
| --- | --- |
| Leads (chatbot, forms, tools) | Postgres table `leads` with RLS |
| AI assistant knowledge search | `pgvector` extension, table `site_chunks` (embeddings of all MDX + `content/owner/`) |
| Chat history | Table `chat_sessions`, `chat_messages` |
| `/admin` login | Supabase Auth (owner email only) |
| CV, screenshots, uploads | Supabase Storage buckets |
| Notification + auto-reply emails | Supabase Edge Function triggered on new lead |
| Tool results, page events | Table `events` |

- All schema changes as migrations in `supabase/migrations/`, with RLS enabled on every table.
- Generate TypeScript types from the schema.
- Re-embed content into `site_chunks` automatically on every deploy (script or Edge Function), so new blog posts are instantly known to the AI assistant.
- Blog posts stay as MDX files in Git (better for SEO, versioning and the autopilot pipeline); only dynamic data lives in Supabase.

## 2. Principles (apply to every phase)

1. **The site is the demo.** It must show the services working (AI assistant, tools, fast pages), not just describe them.
2. **Real experience in every page.** Google demotes mass-produced AI content. Every post and page must pull real details from `content/owner/` (projects, results, process). Never invent clients, numbers, testimonials or results.
3. **Quality over volume.** Max 2 blog posts per week. No thin or near-duplicate pages.
4. **One page = one main keyword.** Never target the same keyword twice.
5. **Every page leads somewhere.** Each page links to a service page and ends with a CTA (AI assistant, booking, or contact).
6. **Mobile Lighthouse 95+** on all templates.

---

## Phase 0 — Audit (no code)

- Inspect: Next.js version, router type, styling, current metadata, sitemap, robots, structured data, OG images, image handling, fonts, hosting (Vercel?), how projects are stored.
- Output `AUDIT.md`: what exists, what is missing, risks, and a time estimate per phase below.
- Create `CLAUDE.md` with project conventions (stack, folders, content rules from Section 2) so every future session and every scheduled run follows them.

## Phase 1 — Technical SEO foundation

- Metadata API on every route: unique title (<60 chars) and description (150–160 chars), `metadataBase = https://hamzatariq.site`, canonical URLs.
- `app/sitemap.ts` (auto-includes blog, work, services, solutions, tools) and `app/robots.ts`.
- JSON-LD: `Person`, `ProfessionalService`, `WebSite`, `BreadcrumbList`; `BlogPosting` and `FAQPage` where relevant.
- Dynamic OG images with `next/og` for every page type.
- `next/image` everywhere, WebP/AVIF, font optimization, no layout shift.
- IndexNow integration so new pages are submitted to Bing/Yandex automatically on deploy.
- Report Lighthouse before/after.

## Phase 2 — Core pages

| Route | Purpose |
| --- | --- |
| `/` | Positioning line, top 3 case studies, 3 services, AI assistant CTA |
| `/services/nextjs-websites` | Service hub: problems solved, process, features, FAQ, pricing range, CTA |
| `/services/dashboards` | Same structure |
| `/services/ai-chatbots` | Same structure |
| `/work/[slug]` | Case studies from MDX: result headline, client + problem, solution, features with screenshots, stack, results, testimonial, live link, CTA |
| `/hire` | For recruiters: skills, experience, stack, GitHub, downloadable CV, availability |
| `/about`, `/contact` | Story, photo, booking form (Cal.com or Calendly embed) |

All copy comes from `content/owner/`. Where a fact is missing, leave a visible `TODO(owner)` and list it in `OWNER_TODO.md` instead of inventing it.

## Phase 3 — Content system

- MDX blog at `/blog/[slug]`: categories (websites, dashboards, ai-chatbots), tags, reading time, table of contents, author box, FAQ block with schema, related posts, RSS, published + last-updated dates.
- Auto CTA per category linking to the matching service page.
- `content/owner/` — single source of truth the automation reads:
  - `profile.md` (bio, positioning line, pricing ranges, process, availability)
  - `projects/*.md` (one per project: client type, problem, solution, stack, results, screenshots, testimonial if any)
- `content/backlog.json` — keyword queue. Each item: `keyword`, `title`, `pillar`, `reader` (business owner / founder / recruiter), `targetPage`, `status` (queued / published), `publishedSlug`.
- Seed the backlog with 30 topics across three pillars (Next.js websites, dashboards, AI chatbots), aimed at business owners, e.g. "Next.js vs WordPress for business", "AI chatbot cost in 2026", "When to move from Excel to a custom dashboard".
- `content/STYLE.md` — writing rules: answer in first 2–3 lines, 5–8 H2s each answering one question, a "From my projects" box using real data from `content/owner/projects`, FAQ (5 questions), CTA, 1200–2000 words, simple English, no fluff.

## Phase 4 — AI site assistant + lead capture

- Chat widget "Ask Hamza's AI" on every page.
- Answers only from site content + `content/owner/`, retrieved from Supabase `site_chunks` (pgvector). If unsure, it says so and offers a call.
- Streaming responses, rate limiting, low-cost model, short system prompt.
- When the visitor shows interest: collect name, email, project type, budget range → store in database (Supabase) → email notification to Hamza → automatic reply email to the visitor ("Thanks, Hamza will reply within 24 hours" + booking link).
- Same lead flow for the contact form and tools.
- Simple `/admin/leads` page behind Supabase Auth, listing leads with source (chatbot, form, tool, page) and status (new, replied, won, lost).

## Phase 5 — Lead-magnet tools

- `/tools/website-cost-calculator`: pages, features, CMS, integrations → price range estimate → "email me the detailed quote" lead capture.
- `/tools/chatbot-roi-calculator`: questions per day, staff cost → savings → "get a demo for your business".
- Each tool page: 500+ words of explanation, FAQ with schema, related service link.
- Optional later: open-source the dashboard template on GitHub with a link back to the site.

## Phase 6 — Industry pages

- Template `/solutions/[industry]` from MDX.
- First 5: restaurants, clinics, real estate, ecommerce, schools. Later up to 15.
- Each page must be genuinely unique: industry pain points, what would be built, example features, relevant case study if one exists, FAQ. No copy-paste with the industry name swapped.

## Phase 7 — Content autopilot

Build the pipeline, then set it up as a **scheduled task** (Claude scheduled task) that runs **twice a week** (e.g. Monday and Thursday).

Each run:
1. Pull latest `main`.
2. Pick the next `queued` item from `content/backlog.json`.
3. Read `CLAUDE.md`, `content/STYLE.md`, `content/owner/`, and existing posts (to avoid overlap and to choose internal links).
4. Write the MDX post following STYLE.md, with real project details from `content/owner/projects`.
5. Run `npm run content:check` (build this script). It must fail the run if:
   - word count < 1200
   - title > 60 chars or meta description not 150–160 chars
   - fewer than 3 internal links, or any broken internal link
   - main keyword missing from title, slug, first paragraph or an H2
   - keyword already used by another page
   - missing FAQ, CTA or image alt text
   - any invented statistic not present in `content/owner/` (flag numbers for review)
6. Run `npm run build`.
7. If all checks pass: commit, update backlog status, push to `main` → Vercel deploys → IndexNow ping.
   If anything fails: open a PR instead of pushing, with the reason in the description.
8. When the backlog has fewer than 5 queued items, generate 10 new keyword ideas (long-tail, business-owner questions) and append them.

Monthly scheduled task:
- Pull Google Search Console data (Search Console API).
- Find pages ranking positions 8–20 and refresh them (better intro, more FAQ, more internal links, updated date).
- Find queries with impressions but no dedicated page → add them to the backlog.
- Write `reports/YYYY-MM.md`: impressions, clicks, top pages, leads by source, what was changed.

## Phase 8 — Analytics

- Vercel Analytics or GA4 with events: `chat_started`, `lead_submitted`, `tool_used`, `booking_clicked`, `cv_downloaded`.
- Google Search Console verified, sitemap submitted (owner does the one-time verification click if needed).
- Bing Webmaster Tools verified.

---

## 8. Definition of done (per phase)

- `npm run build` passes, no TypeScript or lint errors.
- Lighthouse mobile 95+ on the new templates.
- All new pages appear in the sitemap and have valid structured data (Rich Results Test).
- No `TODO(owner)` left silently: every missing fact is listed in `OWNER_TODO.md`.
- Short summary of what changed and what the owner needs to provide.

## 9. What the owner provides once

- [ ] 3–5 projects: client type, problem, what was built, stack, results, screenshots, live link, testimonial (if any)
- [ ] Positioning line, bio, photo
- [ ] Pricing ranges for each service
- [ ] Booking link (Cal.com / Calendly)
- [ ] CV (PDF)
- [ ] Access: GitHub repo, Vercel project, Supabase, email provider (e.g. Resend), AI API key, Google Search Console

## 10. Order of work

Phase 0 → 1 → 2 → 4 → 3 → 7 → 5 → 6 → 8

(AI assistant comes early because it is the strongest proof of skill and starts capturing leads from day one.)
