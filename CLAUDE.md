# CLAUDE.md: hamzatariq.site

Portfolio and inbound lead site for Hamza Tariq (freelance developer: React/Next.js websites, dashboards, AI chatbots). The full roadmap is in `PLAN.md`; the current state is in `AUDIT.md`.

## Working rules

- Work phase by phase in this order: 0 → 1 → 2 → 4 → 3 → 7 → 5 → 6 → 8. Never start the next phase until the owner says "approved".
- Before a phase, list the env variables, API keys and accounts it needs.
- At the end of a phase: run `npm run build`, run mobile Lighthouse on new pages, and report what changed and what the owner must provide.
- Never invent clients, numbers, results, testimonials or quotes. If a fact is missing, write a visible `TODO(owner)` in the page and add it to `OWNER_TODO.md`.
- Real facts come only from `content/owner/` (once it exists) and from the owner's messages.

## Stack

- **Current:** Vite 5 + React 18 + TypeScript (strict) SPA, `react-router-dom` 6. Pending owner decision: migration to Next.js 15 App Router (see `AUDIT.md` section 4). When migrated, update this section.
- **Backend:** Supabase only, for all dynamic data: Postgres (`leads`, `chat_sessions`, `chat_messages`, `events`), `pgvector` (`site_chunks`), Auth (owner-only `/admin`), Storage, Edge Functions (lead emails). Do not add any other database or auth provider.
  - Every schema change is a migration in `supabase/migrations/` with RLS enabled on every table.
  - Regenerate TypeScript types from the schema after each migration.
- **Content:** blog posts, case studies and industry pages are MDX files in Git. Only dynamic data lives in Supabase.
- **Animation/3D:** GSAP 3.14 (ScrollTrigger, ScrollSmoother, SplitText) and Three.js on the home page only. New page templates must not depend on them.
- **Hosting:** Vercel. Domain `https://hamzatariq.site`.

## Folders

- `src/components/` home page sections; styles in `src/components/styles/<Component>.css`.
- `src/pages/` standalone pages (`/work`, `/work/:slug`, 404) sharing `PageShell` and `Pages.css`.
- `src/data/projects.ts` project list (generated from devrexdigital.site/portfolio).
- `public/` CV, 3D model, Draco decoder.
- Planned: `content/owner/` (facts), `content/backlog.json` (keyword queue), `content/STYLE.md` (writing rules), `supabase/`, `reports/`.

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

## Known facts that still need owner confirmation

- "45+ brands and clients" (shown on the site) vs "40+ projects delivered" (devrexdigital.site).
- Projects are Devrex Digital client work; confirm each may be shown as a case study.
- LinkedIn URL (current link is broken).

## Commands

- `npm run dev`: dev server.
- `npm run build`: type-check (`tsc -b`) and production build. Must pass before any commit.
- `npm run lint`: ESLint.
