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
- **Other routes** use the server component `SiteShell` (`src/components/site/SiteShell.tsx`) for header, footer and CTA.
- **Images:** `next/image` everywhere. Remote hosts are allow-listed in `next.config.ts`.
- **Site facts** (URL, email, social links, agency) live in `src/lib/site.ts`. Do not hard-code them elsewhere.
- **Backend:** Supabase only, for all dynamic data: Postgres (`leads`, `chat_sessions`, `chat_messages`, `events`), `pgvector` (`site_chunks`), Auth (owner-only `/admin`), Storage. Do not add any other database or auth provider.
  - Every schema change is a migration in `supabase/migrations/` with RLS enabled on every table. Apply with `npx supabase db push --linked` (the CLI is logged in to the owner's hamzabuildsweb account; project ref `nuewfjfpdlujusoebklf`). Do not use the Supabase MCP tool for this project: it is connected to a different account.
  - Regenerate TypeScript types after each migration: `npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts`.
  - Public writes go through `SECURITY DEFINER` functions (`app_*`) that check `SUPABASE_SERVER_SECRET`; the owner reads through Auth + RLS. Server code uses `rpcClient()` / `getOwner()` from `src/lib/supabase/server.ts`.
- **AI assistant ("Ask Hamza's AI", Phase 4):** widget on every page except `/admin`, loaded when the browser is idle (`AssistantLoader` in the root layout). `/api/chat` embeds the question with Gemini, fetches matching `site_chunks`, and streams a Gemini reply grounded only in that content; chats are logged to Supabase. Model and why: `src/lib/assistant/gemini.ts`.
  - `site_chunks` is filled by `scripts/embed-content.mjs` from the built HTML plus `content/owner/`. It runs as `postbuild` on production deploys only (failures never block a deploy) and locally with `npm run embed` after `npm run build`.
- **Leads:** one flow for the chat, the `/contact` form and future tools: `LeadForm` → `/api/leads` → `app_create_lead` → Resend emails (notification to `SITE.email`, auto-reply from `hello@hamzatariq.site`) sent from the route with `after()`. Emails are sent from Next.js rather than a Supabase Edge Function so they work and can be tested locally with the same env vars. `/admin/leads` (magic-link login, owner email only) lists leads with status and chat transcript.
- **Content:** blog posts, case studies and industry pages are MDX files in Git. Only dynamic data lives in Supabase.
- **Animation/3D:** GSAP 3.14 (ScrollTrigger, ScrollSmoother, SplitText) and Three.js on the home page only. New page templates must not depend on them.
- **Hosting:** Vercel. Domain `https://hamzatariq.site`.

## Folders

- `src/app/` routes (App Router): `/`, `/services`, `/services/[slug]`, `/work`, `/work/hamzatariq-site` (own case study), `/work/[slug]`, `/about`, `/hire`, `/contact`, `not-found`.
- `src/components/` home page sections; styles in `src/components/styles/<Component>.css`. Non-home page styles live in `Pages.css` (shell) and `Content.css` (sections).
- `src/components/site/` shell and widgets for non-home pages: `SiteShell`, `BookCall`, `AuthorBox`, `OwnerTodo`, `CaseStudyCard`, `WorkBrowser`.
- `src/data/services.ts` the four services (copy, process, features, pricing, FAQs). `src/data/caseStudies.ts` case studies with measured results. `src/data/experience.ts` career timeline.
- `src/data/projects.ts` project list (generated from devrexdigital.site/portfolio). Show projects as "Built at Devrex Digital" unless the owner marks one as a personal client.
- `content/owner/` owner facts (`profile.md`, `projects/*.md`); `content/backlog.json` blog keyword queue.
- Missing owner facts: wrap the spot in `<OwnerTodo what="...">fallback</OwnerTodo>` (visible on non-production builds, fallback on production) and list it in `OWNER_TODO.md`.
- `src/components/assistant/` site-wide chat widget (`ChatWidget`, `AssistantLoader`) and `LeadForm`; styles in `ChatWidget.css`, `LeadForm.css`. `/admin` styles in `Admin.css`.
- `src/lib/` shared helpers and site constants; `src/lib/assistant/` chat server logic, `src/lib/leads/` lead options and emails, `src/lib/supabase/` clients and generated types.
- `scripts/embed-content.mjs` embeds site content into `site_chunks`.
- `supabase/migrations/` schema migrations.
- Do not create `src/pages/`: Next.js would treat it as the Pages Router.
- `public/` CV, 3D model, Draco decoder.
- Planned: `content/STYLE.md` (writing rules), `reports/`.

## Design conventions

- Dark theme: background `#0a0e17`, accent teal `#2dd4bf` / `#5eead4`, text `#f1f5f9`, muted text `rgba(226, 232, 240, 0.6)`, font Geist.
- Components: glass cards (`rgba(255,255,255,0.025)` background, `1px rgba(255,255,255,0.08)` border, 18–20px radius), pill buttons (teal primary, ghost secondary), small uppercase eyebrow labels with a 36px teal line.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`. Respect `prefers-reduced-motion`.
- Layout must work at 390px wide with no horizontal scroll.

## Content rules (every page and post)

1. The site is the demo: show working features (assistant, tools, fast pages), not just claims.
2. Real experience in every page, pulled from `content/owner/`. No mass-produced or generic AI text.
3. Max 2 blog posts per week. No thin or near-duplicate pages.
4. One page = one main keyword. Never target a keyword twice.
5. Every page links to a service page and ends with a CTA (AI assistant, booking or contact).
6. Mobile Lighthouse 95+ on all new templates.
7. Titles under 60 characters; meta descriptions 150–160 characters.
8. Simple, clear English. Answer the reader's question in the first 2–3 lines.

## Confirmed owner facts

- Client count: 45+ brands and clients (owner confirmed).
- Projects are shown as "Built at Devrex Digital" unless the owner marks one as their own client.
- No LinkedIn profile. GitHub (`https://github.com/HamzaTariq-Devrex`) is the main profile link.
- AI assistant provider: Google Gemini (chat and embeddings). Phase 4 builds on the owner's `/bot` skill, adapted to Supabase (leads, chat history, pgvector) and site-content-only answers.
- Lead notifications go to `hamzabuildsweb@gmail.com` (`SITE.email`); visitor emails come from `hello@hamzatariq.site`.
- Keep the home page Resume button (bottom right); the chat launcher is positioned around it.
- Accounts: Supabase on hamzabuildsweb; Vercel stays on pulsefire-hamza.
- Positioning line, bio, pricing and services: see `content/owner/profile.md` (mirrored in `src/lib/site.ts` and `src/data/services.ts`; keep them in sync).
- Main keywords (one page each): Next.js website development → `/services/nextjs-websites`; custom dashboard development → `/services/dashboards`; AI chatbot for website → `/services/ai-chatbots`; React SEO services → `/services/react-nextjs-seo`.

## Commands

- `npm run dev`: dev server. It writes to `.next-dev` (see `next.config.ts`), so `npm run build` can run while the owner's dev server is up.
- `npm run build`: lint, type-check and production build. Must pass before any commit.
- `npm run lint`: ESLint (includes the Next.js plugin).
- `npm run typecheck`: TypeScript only.
- `npm run embed`: re-embed site content into Supabase (run after `npm run build`; only changed pages are re-embedded).
- Env vars: see `.env.example`. Never print their values.

## SEO conventions

- Every route exports `metadata` or `generateMetadata` with a canonical URL. Build titles and descriptions with `fitTitle`, `fitDescription` (`src/lib/seo.ts`); never pad them with invented facts.
- Every route has an `opengraph-image.tsx` using `renderOg` (`src/lib/og.tsx`).
- JSON-LD goes in a `<script type="application/ld+json">` via `jsonLd()`. The `Person` node lives on the home page with `@id` `https://hamzatariq.site/#person`; other pages reference it.
- New routes must be added to `src/app/sitemap.ts`.
- IndexNow: `.github/workflows/indexnow.yml` runs on every push to `main`, waits until `/version.txt` serves the pushed commit, then submits the sitemap. The key file is `public/718bcb0be670c128fd877ee016f03bef.txt`; do not delete it.

## Deploy

- GitHub: `HamzaTariq-Devrex/hamzatariq-site`, branch `main`. Pushing to `main` deploys to production on Vercel (project `hamzatariq-site`, account `pulsefire-hamza`).
- Domains: `hamzatariq.site` (primary) and `www.hamzatariq.site` (redirects to primary in `next.config.ts`).
