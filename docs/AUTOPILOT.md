# Content autopilot

A scheduled Claude Code session writes up to 3 blog posts every other day to an expert SEO standard: SERP research and a brief first, then a post that beats the top results with real information gain, linked into its topic cluster. Once a month it measures every post against Search Console and improves it, and writes a report. This file is the session's instructions: point the schedule at it.

Read before every run: `content/STYLE.md` (writing and on-page rules), `content/seo/strategy.md` (clusters and keywords). `npm run content:check` enforces both; a post that fails never goes live.

## Schedule (owner sets this up)

| Job | When | Prompt for the scheduled session |
| --- | --- | --- |
| Post | Every other day, 09:00 PKT | `Run the "Every run" steps in docs/AUTOPILOT.md.` |
| Monthly | 1st of each month, 10:00 PKT | `Run the "Monthly" steps in docs/AUTOPILOT.md.` |

Use `/schedule` in Claude Code (cloud routine on this repo) or any cron that runs `claude -p "<prompt>"` in a checkout with push access. The session needs web search, the env vars below and `gh` logged in (for pull requests).

**Restricted network (cloud sandbox).** Scheduled runs may have no access to outside sites. Two things are built for that:

- **Fonts:** all three fonts (Bricolage Grotesque, Geist, Instrument Serif) are self-hosted from `@fontsource` npm packages (`next/font/local`), so `npm run build` never needs the network.
- **Outside links:** scheduled runs use `npm run content:check -- --external=skip-if-blocked <slugs>`. A link the network blocks (no connection, or 403/407/429 from a proxy) passes as "not verified" when it's on a trusted domain (developers.google.com, web.dev, nextjs.org, react.dev, supabase.com, vercel.com, ai.google.dev, developer.mozilla.org) and fails otherwise. Links that do answer are checked normally, so a real 404 still fails. Local runs keep the full check (`npm run content:check`).

So in new posts, link outside sources on the trusted domains. A link elsewhere can't be checked from the sandbox and fails the run.

**Pace:** up to 3 posts per publish day, publish days at least 2 days apart, max 12 per ISO week; same-day posts are in different clusters and answer clearly different questions (CLAUDE.md content rules, checked by `content:check`, which also fails a post whose title or question H2s are too similar to a post from the last 14 days). `next-topic` returns the next free slot: it fills the latest publish day first (up to 3 slots, a cluster not used that day), then the next day 2+ days later. When that date is more than 2 days away (posts are already scheduled), the run ends without writing. Each post goes live on its date: the daily cron (`/api/cron/publish`, 00:05 PKT) refreshes the blog, sitemap and RSS and pings IndexNow for every post of that day.

## Env vars

| Name | Used for | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVER_SECRET` | Assistant top questions, leads per source, SEO audit stats | Yes (already in `.env.local`) |
| `GSC_SERVICE_ACCOUNT_JSON` | Search Console queries and positions (service account JSON, raw or base64) | Optional (not set up yet: refills use the assistant's questions only, monthly runs skip the Search Console parts) |
| `GSC_SITE_URL` | Search Console property, default `sc-domain:hamzatariq.site` | Optional |

Search Console setup: create a service account in Google Cloud, enable the "Google Search Console API", download its JSON key, and add the service account email as a user (Restricted is enough) on the hamzatariq.site property.

## Every run

A run writes **up to 3 posts**. Do steps 1–10 for one post; after it is finished (step 10 pushed it, or opened a PR), go back to step 2 and call `next-topic` again. Stop after 3 finished posts, when `next-topic` says `skip`, or after a PR. If any `next-topic` output said `"refill": true`, do step 11 once at the end of the run. Every quality rule applies to each post: never shorten the research, brief or checks to fit 3 in.

1. `git checkout main && git pull --ff-only`, then `npm ci` if `package-lock.json` changed.
2. `node scripts/autopilot/next-topic.mjs`
   - `skip` → if it also says `"refill": true`, do step 11, then stop. Otherwise stop: nothing to do today.
   - `"job": "expand-pillar"` → do the **Expand a pillar** steps below instead of steps 3–10.
   - `"job": "new-post"` → you get `topic` (keyword, title, cluster, role, intent, funnel, secondary, questions, reader, angle), `publish` (the post's date), `slotOfDay` (1–3) and `sameDay` (posts already on that date: yours must be in another cluster, which `next-topic` already ensures, and answer a clearly different question, so pick a title and H2s that don't overlap theirs), `slug`, `brief` (where the brief goes), the cluster context (`cluster.servicePage`, `pillar`, `siblings`) and `backlinkCandidates` (older posts that should link to the new one).
3. **Facts.** Read `content/owner/profile.md`, `content/owner/projects/*.md`, `src/data/caseStudies.ts`, `src/data/services.ts`, `src/data/experience.ts` and `content/testimonials.json`. **These are the only sources of facts and numbers.** Never invent clients, results, quotes or statistics. If the topic needs a fact that isn't there, set `"blockedBy": "TODO(owner): …"` on the backlog item, add the question to `OWNER_TODO.md`, commit those two files (`Backlog: block "<keyword>"`), and go back to step 2.
4. **SERP research.** Web-search the primary keyword (and 1–2 of its question variants). Open and read at least 3 of the top results. Note what each covers, what they all miss or get wrong, and the "People also ask" / related questions (if the tool doesn't show them, say so in the brief). Never copy their text.
5. **Original data (optional).** `node scripts/autopilot/audit-stats.mjs`. Only if `"usable": true` (30+ audited sites) and a number fits the topic, use it: copy `query`, `queriedAt` and `sites` into the brief's "Original data" section and say in the post how many sites it covers. Otherwise skip it.
6. **Brief.** Write `content/seo/briefs/<slug>.md` in the format from STYLE.md: search intent, top results with URLs, what they miss, questions to answer, our angle (start from the backlog `angle`, sharpen it with what you found), unique additions (2+), information gain plan, sources.
7. **Write** `content/blog/<slug>.mdx`:
   - Frontmatter as in STYLE.md, with `published: <publish>`, and `category`, `cluster`, `role`, `intent`, `funnel`, `secondary` from the topic. Add a `trust` line with real credentials that fit the topic. Add `howto` only for a real step-by-step.
   - Match the intent (STYLE.md "Search intent match"). Answer the query in the first 100 words; a list, table or bold definition before the second H2; one H2 per question in the brief.
   - Cover what the top results cover, better and shorter, plus the brief's unique additions. At least 2 kinds of information gain, one `<FromMyWork>` box (with a `<Figure>` screenshot when a real one exists in `public/images/work/`), 4–5 FAQ items.
   - Links: the pillar (`/blog/<pillar.slug>` if `pillar.exists`), 2 of `siblings`, `cluster.servicePage`, 1–2 official outside sources; descriptive anchor text only.
   - When a client project really fits the topic (stores, a sector, a feature it has), link its page `/work/<slug>` from `src/data/projects.ts` once, with an anchor that names the brand and what it is ("the Dulhahouse wedding wear store"). Describe only what `projects.ts` says about it. Skip offline projects without features (`isThinProject`): they are not in the sitemap.
   - A **pillar** (`role: pillar`) is the complete guide to the cluster: 2,500–3,500 words, 8–14 H2s, linking every existing supporting post in context (the page also lists them automatically).
8. **Link from older posts.** Add one natural sentence with a descriptive link to the new post in 2–3 of `backlinkCandidates` (same cluster first). Edit only that sentence or paragraph. If the new post is a pillar, also add the link up to it in every supporting post of the cluster that doesn't have one.
9. `npm run content:check -- --external=skip-if-blocked <slug> <each edited older slug>`. Fix every error. Then `npm run build`; it must pass. List any "not verified" links in the run log (they're fine; the owner's local check verifies them later).
10. **Publish:**
    - All green → `node scripts/autopilot/finish.mjs <slug>` (updates the backlog, commits the post, its brief and the edited older posts, pushes to `main`; Vercel deploys, IndexNow and the assistant's embeddings run on deploy). It refuses to commit files outside the allowed paths.
    - Something still fails → fix it and run step 9 **once** more. If it still fails **because of the content** (a check error you couldn't fix without inventing a fact or breaking a rule), `node scripts/autopilot/finish.mjs <slug> --pr "<what failed>"` opens a pull request instead, and nothing goes live.
    - **Never open a PR for a network block.** "Not verified" warnings are not failures. If an outside link fails only because it's blocked and off the trusted list, replace it with an equivalent source on a trusted domain (or remove it if the post still has one outside source). If the build or a script fails because a download or API is unreachable (not because of the content), stop without committing and say so in the run log; the next run tries again. A PR is only for problems the owner has to decide.
11. **Refill** (when `refill` is true):
    - `node scripts/autopilot/refill.mjs` returns real demand (the questions visitors ask the AI assistant most, plus Search Console queries once `GSC_SERVICE_ACCOUNT_JSON` is set; until then that part reports an error, ignore it) and how much room each cluster has (`clusters[].room`, max 30 supporting topics each) and `needed` (30 when fewer than 20 topics are queued).
    - Turn the best of it into **30 new supporting topics** (fewer only if the clusters' `room` doesn't allow 30; say so in the run log) following `content/seo/strategy.md`: long-tail and high buying intent, each in a cluster with room, with intent, funnel, 3–6 secondary keywords, 2–6 question variants, reader and an angle. Prefer queries with impressions and questions asked more than once; if the data is thin, use questions a buyer of the cluster's service would search, checked with a quick web search. Topics that need a missing owner fact get `blockedBy`.
    - Save them as a JSON array (`[{ "keyword", "title", "cluster", "intent", "funnel", "secondary", "questions", "reader", "angle", "source" }]`) in a temp file, run `node scripts/autopilot/refill.mjs --add <file>` (it skips and explains incomplete or duplicate topics), then `npm run content:check -- --offline` (backlog check, no network needed) and commit `content/backlog.json` with the message `Backlog: add N topics`, and push.

### Expand a pillar

For `"job": "expand-pillar"` (a pillar that exists as a shorter post):

1. Do steps 3–6 for the pillar's keyword (facts, SERP research, optional audit data, brief at `content/seo/briefs/<slug>.md`).
2. Rewrite the post into the complete guide: 2,500–3,500 words, 8–14 H2s, all STYLE.md rules, every existing supporting post in the cluster linked in context. Keep the slug, the keyword and `published`; set `updated:` to today.
3. Add the link up to the pillar in every supporting post of the cluster that lacks one (step 8).
4. Steps 9–10 (`finish.mjs <slug>` removes the `expand` flag).

## Monthly

1. Pull `main` as above.
2. `node scripts/autopilot/monthly.mjs` (previous month) gives: posts published, blog posts at positions 8–20 (`refresh`), each post's queries and the ones it doesn't answer yet (`perPost[].unanswered`), low-CTR posts (`lowCtr`), queries where posts compete (`cannibalization`), top pages and queries, and leads per source.
3. **Improve** up to 5 posts, in this order of value:
   - **Competing posts** (`cannibalization`): decide which post should own the query. Make the other one link to it with the query as anchor text and move its overlapping section there; if two posts are near-duplicates, merge them into the stronger one and add a permanent redirect in `next.config.ts` (that file needs a normal reviewed commit, not an autopilot one: open a PR).
   - **Missing questions** (`perPost[].unanswered`, and `refresh` posts first): answer each real query clearly in a new H2 or FAQ item, and add it to the brief's "Questions to answer".
   - **Low CTR** (`lowCtr`): rewrite the `seoTitle` and `description` so they promise what the post really delivers (keyword still near the start, a specific benefit or number, no clickbait). Note the old title and the date in the brief.
   - Posts published before 2026-11-06 that you refresh must reach the full standard: write the brief, add the trust line and a second kind of information gain, and get 2+ links from older posts.
   - Update facts that changed (prices, results) from `content/owner/`, and set `updated:` to today. Keep the slug and main keyword.
   - Run `npm run content:check -- --external=skip-if-blocked <slugs>` and `npm run build`.
4. Write `reports/YYYY-MM.md` using the template below, with only numbers from the script output.
5. Commit the improved posts, their briefs and the report together: `Monthly content report YYYY-MM`. Push to `main` (or open a PR if a content check fails after one retry; never for a network block, as in step 10).

### Report template

```markdown
# Content report: <Month YYYY>

## Summary
<3–4 lines: posts published, clicks and impressions trend, leads by source, what changed.>

## Published this month
- <title> (/blog/<slug>), published <date>

## Improved
| Post | Why (position / unanswered queries / low CTR / competing) | What changed |

## Competing queries
| Query | Posts | Decision |

## Search Console (<range>)
Top pages and top queries tables.

## Leads by source
| Source | Leads |

## Next month
<Topics queued next by cluster, anything blocked on the owner (from OWNER_TODO.md).>
```

## Safety rules

- Never feature the owner's own site (hamzatariq.site) as a project, case study, card, image, cover, figure, `<FromMyWork>` box or headline, and never write a post about migrating or rebuilding it (owner, repeated; 2026-11-09). A post may mention it in at most one line of body text. Use client projects (`src/data/projects.ts`) and the assistant/tools facts instead.
- Never print env values. Never commit `.env*` files.
- Never edit or delete `public/google0a499a204a55eeb8.html` or the IndexNow key file.
- Only `content/blog/`, `content/seo/briefs/`, `content/backlog.json`, `public/images/blog/`, `reports/` and `OWNER_TODO.md` change in autopilot commits (`finish.mjs` enforces this). Never edit `content/testimonials.json`: only the owner adds reviews.
- Up to 3 new posts per run ("Every run"). Edits to older posts are limited to adding links to the new post (and, in monthly runs, the improvements above).
- If anything is unclear or a fact is missing, block the topic instead of guessing.
