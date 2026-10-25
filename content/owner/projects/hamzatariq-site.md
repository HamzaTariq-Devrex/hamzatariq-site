# hamzatariq.site (own project)

- Client type: own portfolio and lead site.
- Live: https://hamzatariq.site
- Case study page: `/work/hamzatariq-site`
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

## Testimonial

None (own project).
