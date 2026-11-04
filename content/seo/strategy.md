# Keyword strategy: hamzatariq.site blog

How the blog wins search traffic as a new site, and the rules every topic in `content/backlog.json` follows. Writing rules are in `content/STYLE.md`; the scheduled sessions follow `docs/AUTOPILOT.md`. `npm run content:check` enforces the parts marked **(checked)**.

## The idea in one paragraph

A new domain can't rank for "web developer" or "React SEO". It can rank for long, specific questions asked by people who are close to buying: "hire next.js developer for ecommerce", "react site not indexed by google fix", "how much to build an ai chatbot for a shopify store". So every post answers one such question better than the current top results, using things only Hamza has (his prices, his projects, his own site's measured results, his tools). The posts are grouped into topic clusters, so Google sees depth on six subjects instead of 60 unrelated pages.

## Topic clusters

Each cluster has one **pillar** (the complete guide, 2,500–3,500 words) and **8–15 supporting posts** (one question each, 1,300–2,000 words). **(checked)** Clusters are defined in `content/seo/clusters.json`.

| Cluster | Pillar (slug) | Service page | Category (CTA) |
| --- | --- | --- | --- |
| Hire a Next.js/React developer | `hire-nextjs-developer` | `/services/nextjs-websites` | hiring |
| React & Next.js SEO | `react-seo-guide` | `/services/react-nextjs-seo` | react-nextjs-seo |
| AI chatbots for business | `ai-chatbot-for-small-business` | `/services/ai-chatbots` | ai-chatbots |
| Ecommerce websites | `custom-ecommerce-website-guide` | `/services/nextjs-websites` | nextjs-websites |
| Dashboards & web apps | `custom-web-app-for-small-business` | `/services/dashboards` | dashboards |
| Working with a remote developer | `working-with-a-remote-web-developer` | `/services/nextjs-websites` | hiring |

A post's category is the cluster's category, or the category whose CTA is the cluster's service page (for example, a hiring-cluster comparison may close with the Next.js websites CTA). **(checked)**

How the cluster links work:

- Every supporting post links **up** to its pillar (once the pillar exists), to **2 sibling posts** in the same cluster (when there are 2 older ones), and to the cluster's **service page**, all with descriptive anchor text. **(checked)**
- The pillar page lists **every** supporting post automatically ("Every guide in …" block, rendered from the cluster).
- Supporting posts show "Part of the guide: …" under the byline once the pillar is live.
- When a new post is published, the autopilot adds a link to it from **2–3 older related posts** (same cluster first). **(checked: at least 2 older posts link to every new post)** A link to a post that isn't live yet renders as plain text on the live site until its date, so links can be added the day the post is written.

Pillars are written early in each cluster's queue so supporting posts have something to link up to. The hiring pillar already exists as a shorter post; it is marked `"expand": true` in the backlog and is expanded to full pillar length by the next autopilot run.

## Every backlog topic has

| Field | Meaning |
| --- | --- |
| `keyword` | Primary keyword: a long-tail query (3+ words), never a head term, never used by another page **(checked)** |
| `title` | Working title |
| `cluster`, `pillar`, `role` | Cluster id, its pillar slug, `pillar` or `supporting` **(checked)** |
| `intent` | `hire` / `buy` / `compare` / `learn` / `fix` **(checked)** |
| `funnel` | `awareness` / `consideration` / `decision` **(checked)** |
| `secondary` | 3–6 secondary keywords; none may be another page's primary keyword **(checked)** |
| `questions` | 2–6 question variants (People Also Ask style) **(checked)** |
| `reader` | Who it's for: business owner, founder, recruiter |
| `angle` | What this post says that the top results don't **(checked: present)** |
| `blockedBy` | A missing owner fact; the topic waits until it's answered |

## Choosing keywords

Prefer, in this order:

1. **Buying intent, long tail:** "hire …", "… cost", "… for [store/startup/business type]", "… vs …" for a decision the reader is about to make.
2. **Problem intent the services fix:** "… not indexed", "… slow", "… not showing", "… mistakes".
3. **Learning intent close to a service:** "how … works", "checklist", "what to prepare".

Avoid: head terms ("web developer", "React SEO", "chatbot") **(checked)**, city names (CLAUDE.md), topics no owner fact can support (block them instead), and anything an existing post or service page already targets **(checked)**.

Sources for new topics, best first: Search Console queries the site already shows up for, questions visitors ask the AI assistant (`app_top_questions`), People Also Ask and related searches found during SERP research, and questions a buyer of each service would ask.

## Information gain sources (what only this site has)

- Real prices, delivery times and terms (`content/owner/profile.md`, `src/data/services.ts`).
- Projects and case studies with screenshots (`src/data/caseStudies.ts`, `content/owner/projects/`, `public/images/work/`).
- Measured results on hamzatariq.site (SEO 83 → 100, LCP 18.0 s → 2.6 s, the assistant's free-tier measurements).
- Client reviews in `content/testimonials.json` (none yet; the owner adds them).
- Aggregate, anonymised results of the free SEO audit tool: `node scripts/autopilot/audit-stats.mjs`. Usable only once **30+ sites** have been audited (2 on 2026-11-05).
- Code, checklists and configuration from this site's own codebase.

## Measure and improve (monthly)

`node scripts/autopilot/monthly.mjs` gives, per post: the Search Console queries it gets impressions for and the ones it doesn't answer yet (`perPost[].unanswered`), posts with high impressions and low CTR (`lowCtr`), and queries where 2+ posts compete (`cannibalization`). The monthly run adds missing questions as H2s or FAQ items, rewrites low-CTR titles and descriptions (keyword still near the start), and merges or re-links competing posts so one page owns each query. Steps in `docs/AUTOPILOT.md`.
