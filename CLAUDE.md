# CLAUDE.md: hamzatariq.site

Portfolio and inbound lead site for Hamza Tariq (freelance developer: React/Next.js websites, dashboards, AI chatbots). The full roadmap is in `PLAN.md`; the current state is in `AUDIT.md`.

## Working rules

- Work phase by phase in this order: 0 → 1 → 2 → 4 → 3 → 7 → 5 → 6 → 8. Never start the next phase until the owner says "approved".
- Before a phase, list the env variables, API keys and accounts it needs.
- At the end of a phase: run `npm run build`, run mobile Lighthouse on new pages, and report what changed and what the owner must provide.
- Never invent clients, numbers, results, testimonials or quotes. If a fact is missing, write a visible `TODO(owner)` in the page and add it to `OWNER_TODO.md`.
- Real facts come only from `content/owner/` (once it exists) and from the owner's messages.

## Stack

- **Framework:** Next.js 15 App Router, React 19, TypeScript (strict). All pages are statically generated unless they need request data.
- **Home page** (`/`) is one client tree (`src/components/HomeClient.tsx`): preloader, GSAP ScrollSmoother, Three.js character and R3F tech stack (both loaded with `next/dynamic`, `ssr: false`). Links into and out of the home page are plain `<a>` (full page load) on purpose, so ScrollSmoother and WebGL state never leak into other routes. Every other route uses `next/link`.
- **One navbar everywhere:** `SiteHeader` (`src/components/site/SiteHeader.tsx`, styles `SiteHeader.css`): logo, Services dropdown, Work, About, Blog, Free SEO Audit (badge), Contact, Book a free call. Links always open real pages (never `#anchors`); active state comes from the pathname (nested pages included). On the home page it is rendered with `home` (plain `<a>` links, fixed position) and portalled to `<body>`, because inside the home tree it ends up under other fixed layers. GSAP ScrollSmoother lives in `src/components/SmoothScroll.tsx`.
- **Other routes** use the server component `SiteShell` (`src/components/site/SiteShell.tsx`) for header, footer and CTA.
- **Images:** `next/image` everywhere. Remote hosts are allow-listed in `next.config.ts`.
- **Site facts** (URL, email, social links, agency) live in `src/lib/site.ts`. Do not hard-code them elsewhere.
- **Backend:** Supabase only, for all dynamic data: Postgres (`leads`, `chat_sessions`, `chat_messages`, `events`), `pgvector` (`site_chunks`), Auth (owner-only `/admin`), Storage. Do not add any other database or auth provider.
  - Every schema change is a migration in `supabase/migrations/` with RLS enabled on every table. Apply with `npx supabase db push --linked` (the CLI is logged in to the owner's hamzabuildsweb account; project ref `nuewfjfpdlujusoebklf`). Do not use the Supabase MCP tool for this project: it is connected to a different account.
  - Regenerate TypeScript types after each migration: `npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts`.
  - Public writes go through `SECURITY DEFINER` functions (`app_*`) that check `SUPABASE_SERVER_SECRET`; the owner reads through Auth + RLS. Server code uses `rpcClient()` / `getOwner()` from `src/lib/supabase/server.ts`.
- **AI assistant ("Ask Hamza's AI", Phase 4):** widget on every page except `/admin`, loaded when the browser is idle (`AssistantLoader` in the root layout). `/api/chat` embeds the question with Gemini, fetches matching `site_chunks`, and streams a Gemini reply grounded only in that content; chats are logged to Supabase. Model and why: `src/lib/assistant/gemini.ts`.
  - Gemini free tier, no billing (owner's decision). One chat model, no Flash-Lite fallback. No chat rate limits (the lead form keeps its 5/hour per IP limit). When Gemini fails, is out of quota (then skipped at once until it resets) or doesn't start replying within 7 s, the reply comes from the offline answer bank `content/chatbot/answers.json` via `src/lib/assistant/offline.ts` (keyword/phrase/typo matching, no API call); no match → "Hamza will answer this personally" + lead form, WhatsApp and email. Off-topic questions (coding help, trivia, jokes, homework) get exactly one line: "I can only help with questions about Hamza's services and projects." Answers in the bank use only owner facts; keep them in sync when prices or services change.
  - `site_chunks` is filled by `scripts/embed-content.mjs` from the built HTML plus `content/owner/`. It runs as `postbuild` on production deploys only (failures never block a deploy) and locally with `npm run embed` after `npm run build`.
- **Leads:** one flow for the chat, the `/contact` form and future tools: `LeadForm` → `/api/leads` → `app_create_lead` → Resend emails (notification to `SITE.email`, auto-reply from `hello@hamzatariq.site`) sent from the route with `after()`. Emails are sent from Next.js rather than a Supabase Edge Function so they work and can be tested locally with the same env vars. The lead form has an optional WhatsApp number (`leads.phone`).
- **Admin dashboard** (`src/app/admin/(dashboard)/`, sidebar layout checks the owner): `/admin` overview (stat cards with change vs the previous period in Pakistan time, leads per day, by source, by service, latest leads), `/admin/leads` (search, filters, sort, CSV export, side panel with transcript, status, private `notes`, Gmail/WhatsApp/copy actions; `?lead=<id>` opens a lead), `/admin/chats` (sessions, top 20 questions without off-topic ones, off-topic and saved-answer counts). Real Supabase data only; UI in `src/components/admin/`, styles in `Admin.css`, labels and service grouping in `src/lib/admin/labels.ts`. Chart bars use `#0d9488` (validated for the dark surface with the dataviz validator). `/admin/login` is email + password only (Supabase `signInWithPassword` in a server action; no magic link), owner email only, session kept 30 days from the last visit (`src/lib/supabase/session.ts`). The owner user is created/updated with the Supabase admin API; sign-ups stay blocked by the `only_owner_signup` trigger.
- **Content:** blog posts, case studies and industry pages are MDX files in Git. Only dynamic data lives in Supabase.
- **Blog (Phase 3):** posts are `content/blog/<slug>.mdx` (frontmatter and rules in `content/STYLE.md`), parsed by `src/lib/blog.ts` and compiled server-side with `@mdx-js/mdx` (`src/components/blog/mdx.tsx`: `<FromMyWork>`, `<Figure>`). Five categories with their closing CTA in `content/blog-categories.json`. Routes: `/blog`, `/blog/[slug]`, `/blog/category/[category]`, `/blog/tag/[tag]` (noindex), `/blog/rss.xml`; all revalidate daily so posts dated in the future appear on their `published` date (PKT); local and preview builds show them early. Posts get BlogPosting, FAQPage and BreadcrumbList JSON-LD and their own OG image, and are added to the sitemap, the assistant's embeddings and IndexNow automatically on deploy.
- **Quality gate:** `npm run content:check` (`scripts/content-check.mjs`) fails a post on length, title/description length, keyword placement or reuse, links (min 3 internal, 1 outside, no broken ones), FAQ, `<FromMyWork>`, alt text, banned filler, any number not found in `content/owner/`, `caseStudies.ts`, `services.ts` or `experience.ts`, or a post less than 2 days after the previous one (max 4 per ISO week). It runs offline as `prebuild`. `content/backlog.json` is the topic queue (60 topics; `blockedBy` marks topics waiting on an owner fact).
- **Content autopilot (Phase 7):** `docs/AUTOPILOT.md` is the prompt for the scheduled sessions (one post every other day; monthly refresh of posts at positions 8–20 and `reports/YYYY-MM.md`). Scripts in `scripts/autopilot/` (`next-topic`, `finish`, `refill`, `monthly`); Search Console via a service account (`GSC_SERVICE_ACCOUNT_JSON`).
- **Free tools (Phase 5):** listed in `TOOLS` (`src/data/tools.ts`), which feeds the Services menu, footer, home Contact section and sitemap. Each tool's `source` is its lead source. The two calculators share pure logic with `/api/leads`, which recomputes the result from the visitor's inputs (never trusts browser numbers) and emails it with `sendToolResult`:
  - `/tools/website-cost-calculator` (`src/lib/tools/cost.ts`): picks the smallest real package from `src/data/services.ts` for the site type and features, sums starting prices and timelines, and adds the owner's add-ons (`ADD_ONS` in `services.ts`: CMS +$150, second language +$250). Extra pages beyond a tier's `pages` (landing 5, store 10, full ecommerce app 15) cost $50 each; dashboards and web apps are quoted by features.
  - `/tools/chatbot-roi-calculator` (`src/lib/tools/roi.ts`): only visitor inputs, formula shown, payback against the chatbot price from `services.ts`. No benchmarks.
- **Industry pages (Phase 6):** `/solutions` and `/solutions/[industry]` from `content/solutions/*.mdx` (structured frontmatter: pains, build per service, features, real `projects` only when they fit, FAQ; prose body), parsed by `src/lib/solutions.ts`. One keyword each, never a city; `content:check` applies the post rules (numbers, filler, keyword uniqueness against posts, backlog, services and tools, links, FAQ). Menu/footer link in `src/data/solutions.ts`.
- **Analytics (Phase 8):** `<Analytics />` (Vercel Web Analytics) in the root layout; `trackEvent()` in `src/lib/analytics.ts` sends `chat_started`, `lead_submitted`, `tool_used` (tool slug), `audit_run`, `booking_clicked`, `cv_downloaded` to Vercel (custom events show there on Pro plans only). The same events are stored in Supabase `events`: `chat_started`, `lead_submitted` and `audit_run` by the server functions, the other three through `/api/events` (whitelisted names and tool slugs, 60/hour per IP). The `/admin` overview counts them (last 30 days vs the 30 before, plus tools by tool).
- **Free SEO audit tool** (`/tools/free-seo-audit`, `src/lib/audit/`, `/api/audit`): fetches the raw HTML through `safeFetch` (SSRF guard: http(s) on ports 80/443, no credentials or internal host names, every resolved IP checked at connect time, redirects re-validated, 8 s timeout, 2 MB cap), runs 17 weighted checks plus PageSpeed Insights (`PAGESPEED_API_KEY`), caches results 24 h in `seo_audits` and allows 10 new audits per IP per hour (in-memory fallback for both). "Email me the full report" is a lead with source `seo-audit` linked by `leads.audit_id`; the visitor gets the full report email, the owner a notification with URL and score. Entry points (`AuditCta`, a GET form to `/tools/free-seo-audit?url=…`, which starts the audit on load): "Free SEO Audit" link with a "Free" badge in the navbar (desktop and mobile), a band on the home page after What I Do (layered above the 3D character), a box after the first `<FromMyWork>` in every post (`renderMdx(…, { auditCta: true })`), and boxes on service and industry pages. Each click sends `audit_cta_click` with its location (nav, home, blog, service, solution), counted on /admin. The assistant suggests the audit for SEO, speed and ranking questions (prompt rule and the offline `site-speed` answer). Never weaken the SSRF checks; Node's `BlockList` must not get an `::ffff:0:0/96` rule (it matches every IPv4 address).
- **Animation/3D:** GSAP 3.14 (ScrollTrigger, ScrollSmoother, SplitText) and Three.js on the home page only. New page templates must not depend on them.
- **Hosting:** Vercel. Domain `https://hamzatariq.site`.

## Folders

- `src/app/` routes (App Router): `/`, `/services`, `/services/[slug]`, `/work`, `/work/hamzatariq-site` (own case study), `/work/[slug]`, `/about`, `/hire`, `/contact`, `/blog/**`, `/tools/*` (SEO audit, website cost calculator, chatbot ROI calculator), `/solutions`, `/solutions/[industry]`, `not-found`.
- `src/components/` home page sections; styles in `src/components/styles/<Component>.css`. Non-home page styles live in `Pages.css` (shell) and `Content.css` (sections).
- `src/components/site/` shell and widgets: `SiteHeader` (all pages), `SiteShell`, `BookCall`, `AuthorBox`, `OwnerTodo`, `CaseStudyCard`, `WorkBrowser`.
- `src/data/services.ts` the four services (copy, process, features, pricing, FAQs). `src/data/caseStudies.ts` case studies with measured results. `src/data/experience.ts` career timeline.
- `src/data/projects.ts` project list (generated from devrexdigital.site/portfolio). Show projects as "Built at Devrex Digital" unless the owner marks one as a personal client.
- `content/owner/` owner facts (`profile.md`, `projects/*.md`); `content/backlog.json` blog keyword queue.
- Missing owner facts: wrap the spot in `<OwnerTodo what="...">fallback</OwnerTodo>` (visible on non-production builds, fallback on production) and list it in `OWNER_TODO.md`.
- `src/components/admin/` dashboard UI (`AdminNav`, `LeadsBrowser`, `LeadPanel`, `DailyBars`, `ChatSessions`, `Transcript`, shared pieces in `ui.tsx`).
- `src/components/assistant/` site-wide chat widget (`ChatWidget`, `AssistantLoader`) and `LeadForm`; styles in `ChatWidget.css`, `LeadForm.css`. `/admin` styles in `Admin.css`.
- `src/lib/` shared helpers and site constants; `src/lib/assistant/` chat server logic, `src/lib/leads/` lead options and emails, `src/lib/supabase/` clients and generated types.
- `scripts/embed-content.mjs` embeds site content into `site_chunks`.
- `supabase/migrations/` schema migrations.
- Do not create `src/pages/`: Next.js would treat it as the Pages Router.
- `public/` CV, 3D model, Draco decoder.
- `content/STYLE.md` writing rules, `content/blog/` posts, `docs/AUTOPILOT.md`, `reports/` monthly content reports.
- `src/data/tools.ts` free tools (name, link, keyword, lead source); `src/components/tools/` their UI, styles in `Audit.css` and `Tools.css`; calculator logic in `src/lib/tools/`.
- `content/solutions/` industry pages (MDX); `src/lib/solutions.ts`.

## Design conventions

- **Design system** (About, /services and service pages; reuse it for new pages): `src/components/site/ds/` (`Section` label→heading→lead rhythm, `Icon`, `CountUp`, `Reveal` scroll fade-in via `data-reveal`, `Mockups` laptop/phone/browser frames around real screenshots, `HeroVisual` per service, `Faq` accordion, `OpenChat` opens the AI assistant) with styles in `src/components/styles/Premium.css` (`x-` classes). Real screenshots and real numbers only; hidden elements must not widen the page at 390px.
- `BookCall` is the only "Book a free call" button: Calendly popup when `CALENDLY_URL` is set, otherwise `/contact`. `SiteShell` takes `cta` (closing band text) and `stickyCta` (mobile bar on service pages).

- Dark theme: background `#0a0e17`, accent teal `#2dd4bf` / `#5eead4`, text `#f1f5f9`, muted text `rgba(226, 232, 240, 0.6)`, font Geist.
- Components: glass cards (`rgba(255,255,255,0.025)` background, `1px rgba(255,255,255,0.08)` border, 18–20px radius), pill buttons (teal primary, ghost secondary), small uppercase eyebrow labels with a 36px teal line.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`. Respect `prefers-reduced-motion`.
- Layout must work at 390px wide with no horizontal scroll.

## Content rules (every page and post)

1. The site is the demo: show working features (assistant, tools, fast pages), not just claims.
2. Real experience in every page, pulled from `content/owner/`. No mass-produced or generic AI text.
3. At most one blog post every 2 days (max 4 per week). No thin or near-duplicate pages.
4. One page = one main keyword. Never target a keyword twice.
5. Every page links to a service page and ends with a CTA (AI assistant, booking or contact).
6. Mobile Lighthouse 95+ on all new templates.
7. Titles under 60 characters; meta descriptions 150–160 characters.
8. Simple, clear English. Answer the reader's question in the first 2–3 lines.

## Confirmed owner facts

- Client count: 45+ brands and clients (owner confirmed).
- Location and market: based in Bahawalpur, Pakistan, selling to international clients (US, UK, Europe, Middle East). Never target a city on pages or in blog topics. Pages show "Based in Pakistan · Working with clients worldwide" and "Available in US, UK and EU time zones" (`SITE.location`, `SITE.timezones`, `WhereIWork`); "Bahawalpur, Pakistan" appears only in the Person schema `address` (`SITE.address`). Prices always in USD.
- Education: BS Artificial Intelligence, The Islamia University of Bahawalpur, 2022–2026 (`UNIVERSITY` in `src/data/experience.ts`). No company logos; text only.
- "Most popular" pricing tiers: Ecommerce store with admin dashboard, AI chatbot.
- Projects are shown as "Built at Devrex Digital" unless the owner marks one as their own client.
- No LinkedIn profile. GitHub (`https://github.com/HamzaTariq-Devrex`) is the main profile link.
- AI assistant provider: Google Gemini (chat and embeddings). Phase 4 builds on the owner's `/bot` skill, adapted to Supabase (leads, chat history, pgvector) and site-content-only answers.
- Lead notifications go to `hamzabuildsweb@gmail.com` (`SITE.email`); visitor emails come from `hello@hamzatariq.site`.
- Keep the home page Resume button (bottom right); the chat launcher is positioned around it.
- Project terms (all services): 50% upfront, 50% on delivery; 2 free revision rounds; 30 days of free bug fixes after launch, ongoing maintenance quoted separately. Delivery times per tier are in `src/data/services.ts` (`timeline`) and `content/owner/profile.md`.
- Accounts: Supabase on hamzabuildsweb; Vercel stays on pulsefire-hamza.
- Positioning line, bio, pricing and services: see `content/owner/profile.md` (mirrored in `src/lib/site.ts` and `src/data/services.ts`; keep them in sync).
- Main keywords (one page each): Next.js website development → `/services/nextjs-websites`; custom dashboard development → `/services/dashboards`; AI chatbot for website → `/services/ai-chatbots`; React SEO services → `/services/react-nextjs-seo`.

## Commands

- `npm run dev`: dev server. It writes to `.next-dev` (see `next.config.ts`), so `npm run build` can run while the owner's dev server is up.
- `npm run build`: lint, type-check and production build. Must pass before any commit.
- `npm run lint`: ESLint (includes the Next.js plugin).
- `npm run typecheck`: TypeScript only.
- `npm run embed`: re-embed site content into Supabase (run after `npm run build`; only changed pages are re-embedded).
- `npm run content:check`: blog quality gate, including outside link checks (`-- <slug>` for one post, `-- --offline` to skip outside links).
- Env vars: see `.env.example`. Never print their values.

## SEO conventions

- Every route exports `metadata` or `generateMetadata` with a canonical URL. Build titles and descriptions with `fitTitle`, `fitDescription` (`src/lib/seo.ts`); never pad them with invented facts.
- Every route has an `opengraph-image.tsx` using `renderOg` (`src/lib/og.tsx`).
- JSON-LD goes in a `<script type="application/ld+json">` via `jsonLd()`. The `Person` node lives on the home page with `@id` `https://hamzatariq.site/#person`; other pages reference it.
- New routes must be added to `src/app/sitemap.ts`.
- IndexNow: `.github/workflows/indexnow.yml` runs on every push to `main`, waits until `/version.txt` serves the pushed commit, then submits the sitemap. The key file is `public/718bcb0be670c128fd877ee016f03bef.txt`; do not delete it.
- Google Search Console verification: `public/google0a499a204a55eeb8.html`, served at `/google0a499a204a55eeb8.html`. Never delete or edit it, and never let middleware, redirects or robots rules cover that path.

## Deploy

- GitHub: `HamzaTariq-Devrex/hamzatariq-site`, branch `main`. Pushing to `main` deploys to production on Vercel (project `hamzatariq-site`, account `pulsefire-hamza`).
- Domains: `hamzatariq.site` (primary) and `www.hamzatariq.site` (redirects to primary in `next.config.ts`).
