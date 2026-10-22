# Phase 0 Audit: hamzatariq.site

Date: 2026-10-22. Audited the local project at `D:\PROJECTS\My-Portfolio-main` and the live domain.

## 1. Blockers (must be solved before Phase 1 can finish)

| # | Finding | Impact | What is needed |
| --- | --- | --- | --- |
| B1 | **The live site is down.** `https://hamzatariq.site` returns `404 DEPLOYMENT_NOT_FOUND` from Vercel on every URL, including `/robots.txt` and `/sitemap.xml`. | Google cannot crawl anything. Zero inbound traffic until fixed. | Access to the Vercel project (or a new one) to redeploy and re-attach the domain. |
| B2 | **The project is not Next.js.** PLAN.md assumes Next.js (App Router, Metadata API, `app/sitemap.ts`, `next/og`, `next/image`, API routes). The project is **Vite 5 + React 18 SPA** with `react-router-dom` 6. | Every page is rendered in the browser. Crawlers get an empty `<div id="root">` with one hard-coded title. Phases 1–7 depend on server-rendered pages. | Owner decision: migrate to Next.js (recommended, see section 4). |
| B3 | **Not a git repository.** No `.git`, no GitHub remote. | The Phase 7 autopilot (pull, commit, push, PR) cannot run. Vercel cannot auto-deploy from pushes. | GitHub repo (new or existing) and permission to `git init` and push. |
| B4 | **AI assistant provider not chosen.** The prompt still says `[Gemini / Claude / OpenAI]`. | Phase 4 cannot start; it also decides the embedding model for `site_chunks`. | Owner picks one. |

## 2. What exists today

| Area | Current state |
| --- | --- |
| Framework | Vite 5.4, React 18.3, TypeScript 5.5 (strict), ESLint 9. Package name is still `rajesh-portfolio` (from the open-source template this site is based on). |
| Routing | `react-router-dom` 6.28, client-side only. Routes: `/` (3D home), `/work` (all projects), `/work/:slug` (31 project pages), `*` (404). |
| Styling | Plain CSS files per component in `src/components/styles/` and `src/pages/Pages.css`. No Tailwind, no CSS modules. Design tokens are ad hoc (`--accentColor`, `--backgroundColor` in `src/index.css`). |
| Home page | GSAP 3.14 (ScrollTrigger, ScrollSmoother, SplitText) + Three.js 3D character (`public/models/character.enc`, 2.3 MB, AES-encrypted GLB, Draco), preloader, React Three Fiber tech-stack scene with Rapier physics. |
| Projects | `src/data/projects.ts`: 31 projects scraped from devrexdigital.site/portfolio (title, label, category, live URL, domain, description, features, desktop and mobile screenshot paths). 5 are marked offline. No client problem, results, stack or testimonials per project. |
| Images | All project screenshots are hot-linked from `https://www.devrexdigital.site/images/portfolio/`; logo and favicon from a DigitalOcean Spaces CDN. No responsive `srcset`, no width/height on most `<img>`. |
| Fonts | Geist via a render-blocking Google Fonts `<link>` in `index.html`. |
| Metadata | `index.html` has only `<title>` and `viewport`. No meta description, canonical, Open Graph or Twitter tags. Sub-pages set `document.title` and meta description from JavaScript at runtime only. |
| Sitemap / robots | None. |
| Structured data | None. |
| OG images | None. |
| Analytics | `@vercel/analytics` is installed but **never imported**, so nothing is tracked. No GA4, no Search Console verification files. |
| Hosting | `vercel.json` with an SPA rewrite exists. Domain is on Vercel but no deployment is attached (B1). |
| Backend | None. No Supabase, no API, no forms. Contact is `mailto:` and WhatsApp links only. |
| Content | No blog, no service pages, no `/hire`, `/about`, `/contact`, no `content/` folder. CV exists at `public/Hamza Tariq Resume.pdf`. |
| Tests / CI | None. |

## 3. Lighthouse baseline (mobile, local production build)

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | **35** | 89 | 100 | 83 | 18.0 s | 1,970 ms |
| `/work` | 85 | 94 | 100 | 92 | 3.3 s | 0 ms |
| `/work/dulhahouse` | 88 | 100 | 100 | 92 | 2.9 s | 0 ms |

Failing audits: `meta-description`, `robots-txt` (SEO); `color-contrast`, `heading-order`, `aria-prohibited-attr` (accessibility); oversized images on `/work` (`uses-responsive-images`). Home transfers 3.2 MB; the lazy `TechStack` chunk alone is 2.5 MB (Rapier physics) and `three` is 680 KB.

## 4. Recommendation for B2 (framework)

**Migrate to Next.js 15 (App Router) as the first step of Phase 1.**

- Server-rendered HTML, Metadata API, `app/sitemap.ts`, `app/robots.ts`, `next/og`, `next/image` and route handlers are exactly what Phases 1–7 specify. Rebuilding those on Vite would mean hand-rolling a prerenderer, an OG image service and a separate API host.
- The existing UI ports with little change: the 3D home becomes a client component loaded with `dynamic(..., { ssr: false })`, and `/work` + `/work/[slug]` become statically generated pages from `src/data/projects.ts` (later MDX).
- Plain CSS files can be kept as global CSS or moved to CSS modules; no restyle is needed.

Alternative (not recommended): stay on Vite and add a prerender plugin. Cheaper now, but every later phase gets harder and `next/og`, the Metadata API and route handlers would need substitutes.

**Home page performance:** a 95+ mobile score is not reachable while the 3D character and physics scene load on the first view. Plan for Phase 1: render the hero text and CTA as server HTML (good LCP), and load the 3D scene only after first paint and only on capable devices, with a static image fallback on mobile. New templates (services, blog, tools) will target 95+ without 3D.

## 5. Risks

- **Invented or unverified numbers already on the site.** "45+ brands and clients" (About, Career) and "100% custom-coded, no templates" are owner claims; devrexdigital.site says "40+ projects delivered". These must be confirmed in `content/owner/profile.md` before Phase 2 copy reuses them.
- **Agency vs personal work.** All 31 projects are Devrex Digital client work. Case studies must say clearly that they were built through Devrex Digital, and need the owner's confirmation that each client may be shown.
- **Hot-linked images.** If devrexdigital.site renames or removes screenshots, project pages break. Move them to Supabase Storage (or `public/`) in Phase 2.
- **Broken link.** LinkedIn in `src/components/Contact.tsx` points to `https://www.linkedin.com/3`.
- **Leftovers.** `test.js` in the root and `src/components/WorkImage.tsx` are unused; the README describes the original template. Clean up during the migration.
- **GSAP licensing.** README warns about "trial" club plugins. GSAP 3.13+ ships SplitText and ScrollSmoother in the public package, and the installed version is 3.14.2, so this no longer blocks hosting.
- **AI chatbot cost and abuse.** Phase 4 needs rate limiting and a low-cost model from day one.

## 6. Estimates per phase

Estimates are focused build time with Claude Code, excluding waiting on owner inputs.

| Phase | Scope | Estimate |
| --- | --- | --- |
| 1 | Next.js migration (port home, work pages) + technical SEO (metadata, sitemap, robots, JSON-LD, OG images, images, fonts, IndexNow) + redeploy | 2–3 days |
| 2 | Service pages ×3, case-study template, `/hire`, `/about`, `/contact` with booking embed | 2–3 days (copy depends on owner facts) |
| 4 | Supabase schema + RLS, pgvector embeddings, chat widget with streaming, lead capture, emails via Edge Function, `/admin/leads` | 3–4 days |
| 3 | MDX blog, `content/owner/`, backlog of 30 topics, STYLE.md | 2 days |
| 7 | `content:check` script, scheduled twice-weekly writer, monthly Search Console refresh and report | 2–3 days |
| 5 | Two calculators with lead capture | 1–2 days |
| 6 | Industry template + first 5 pages | 2 days |
| 8 | Analytics events, Search Console and Bing verification | 0.5 day |

## 7. What the owner needs to provide for Phase 1

- Vercel: access to the project behind hamzatariq.site (or permission to create a new one) and the domain settings.
- GitHub: a repository to push to (new or existing) and permission to initialise git here.
- Decision on B2: Next.js migration (recommended) or stay on Vite.
- Decision on B4: AI provider (needed by Phase 4; asking now so the Phase 1 structure can plan for it).
- No API keys are needed for Phase 1. The IndexNow key is generated by us and hosted as a file.
