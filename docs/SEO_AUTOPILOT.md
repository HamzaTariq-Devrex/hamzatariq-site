# SEO autopilot

A scheduled Claude Code session applies the fix queue of the SEO Command Center (`/admin/seo`) once a day. The site finds the work itself: an hourly sync (`/api/seo/sync`, Supabase pg_cron job `seo-sync`) pulls Search Console, URL Inspection, sitemaps, Core Web Vitals and Bing, crawls every sitemap URL, and turns problems and opportunities into **fix rows**. Code can't change from Vercel at runtime, so this session makes the changes, commits, pushes and marks each fix done with its commit hash. The dashboard then shows "before → after" for the page over the next 28 days.

This file is the session's instructions. Read `CLAUDE.md`, `content/STYLE.md` and `docs/AUTOPILOT.md` (the blog autopilot: pace, trusted outside domains, restricted-network rules) before every run.

## Schedule

| Job | When | Prompt |
| --- | --- | --- |
| SEO fixes | Daily, 11:00 PKT (06:00 UTC) | `Run the "Every run" steps in docs/SEO_AUTOPILOT.md.` |

It runs as a Claude Code cloud routine on `HamzaTariq-Devrex/hamzatariq-site` (created with `/schedule`), or any cron that runs `claude -p "<prompt>"` in a checkout with push access to `main`.

## Env vars

| Name | Used for |
| --- | --- |
| `CRON_SECRET` | Bearer for `/api/seo/fixes` (same value as in Vercel) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVER_SECRET` | `npm run build` and the blog scripts (as in `docs/AUTOPILOT.md`) |

## Fix statuses

- `auto`: safe, apply it now without asking.
- `waiting`: risky, the owner has to click Approve in `/admin/seo`. **Never apply a waiting fix.**
- `queued`: approved by the owner, apply it now.
- `done` (with the commit), `failed` (retried up to 3 times, then left for the owner), `dismissed`.

The queue API only returns `auto` and `queued` fixes, and holds back any page that had a fix done in the last 28 days, so every change can be measured on its own.

## Every run

1. `git checkout main && git pull --ff-only`, then `npm ci` if `package-lock.json` changed.
2. `node scripts/seo-autopilot/queue.mjs list 20` → the fixes to apply (JSON). Empty → stop: nothing to do.
3. Work through them **one fix per commit**, at most **8 fixes per run** and at most **5 different blog posts per run**. For each fix:
   1. Read `type`, `page`, `change`, `reason` and `data`. `reason` holds the real numbers (Search Console range, position, impressions, crawl result). Re-check that the problem still exists (open the file; for crawl issues `npx tsx scripts/seo-crawl.ts <path>`). Already fixed → `queue.mjs done <id> <HEAD hash> "already fixed"`, next fix.
   2. Apply it with the playbook below. Facts only from `content/owner/`, `src/data/*.ts` and `content/testimonials.json`; never invent clients, numbers, results or quotes.
   3. `npm run content:check -- --external=skip-if-blocked <each edited slug>` and `npm run build`. Both must pass.
   4. `node scripts/seo-autopilot/commit.mjs "<what changed>" "<why, copied from the fix reason>"` (add `--approved` only for a `queued` fix). It prints the commit hash and pushes to `main`.
   5. `node scripts/seo-autopilot/queue.mjs done <id> <hash> "<one line on what changed>"`.
   6. If it can't be done without breaking a rule, inventing a fact or failing a check after one retry: `git checkout -- . && git clean -fd content/`, then `queue.mjs failed <id> "<why>"`. Never open a PR for a network block (see `docs/AUTOPILOT.md` step 10).
4. End the run with a short log: fixes done (commit hashes), failed (why), skipped.

## Playbooks (safe fixes: blog posts and the backlog only)

`commit.mjs` refuses any other path for a safe fix. Edit only what the fix needs; keep each post's slug, main keyword and `published` date.

- **`title-meta`** (low CTR, length, duplicate): rewrite `seoTitle` (with the suffix under 60 characters) and `description` (150–160) so they promise what the post really delivers for its top queries (`data.topQueries`): keyword near the start, a specific benefit, no clickbait, no invented numbers. Add a line to the brief (`content/seo/briefs/<slug>.md`, "Title history"): old title, new title, date, the CTR and position from `reason`.
- **`secondary-faq`** (striking distance, not answered yet): add the query to `secondary` (max 6; replace the weakest if full) and answer it in a new H2 (if it's a real sub-question) or a FAQ item, from owner facts. Add it to the brief's "Questions to answer". Watch keyword density and the "distinct questions" check.
- **`internal-links`** (striking distance already answered, orphan, not indexed): add one natural sentence with a descriptive link to the target post in 2–3 related older posts (same cluster first), anchor = the query or a close variant. Never the same anchor twice. If the target is a pillar, also check every supporting post links up to it.
- **`alt-text`**: describe each image in the post (`<Figure alt>` or markdown alt) in plain words; decorative images get `alt=""`.
- **`broken-link`**: internal: point the link at the right live page (check `src/app/sitemap.ts` routes), or remove it. Outside: replace with an equivalent source on a trusted domain (`docs/AUTOPILOT.md`), or remove it if the post still has one outside source.
- **`refresh-post`** (losing clicks, thin, not indexed): bring the post to the full STYLE.md standard: answer the queries it gets (`node scripts/autopilot/monthly.mjs` lists each post's unanswered queries in `perPost`), update facts that changed from `content/owner/`, add a second kind of information gain if missing, write the brief if it has none. Set `updated:` to today. Never change `published`.
- **`backlog-add`** (missing page or approved keyword idea): turn `data.keyword` into one backlog topic (keyword, title, cluster with room, intent, funnel, 3–6 secondary keywords, 2–6 questions, reader, angle, `source: "seo-autopilot"`), save it as a one-item JSON array and run `node scripts/autopilot/refill.mjs --add <file>`. **Never write or publish the post here**: the blog autopilot writes it at its own pace (max 3 per publish day, publish days 2+ days apart, max 12 per ISO week). Mark the fix failed (with the reason) if the topic would target a city or country, Shopify, a service Hamza doesn't offer, or a keyword another page already targets.

## Approved fixes (status `queued`)

These were risky, and the owner approved them in `/admin/seo`. Use `--approved` with `commit.mjs`. Allowed: redirects and the sitemap logic (`next.config.ts`, `src/app/sitemap.ts`), merging or deleting a page, service/home/industry copy (`src/data/services.ts`, `content/solutions/*.mdx`, components), metadata and structured data in code, performance work.

- Keep `CLAUDE.md`: one keyword per page, titles under 60 characters, meta 150–160, real facts only, the own site never featured in the UI.
- Merges: keep the stronger page (more clicks, the keyword owner), move what's unique, add a permanent redirect in `next.config.ts`, update every internal link to the new URL.
- Never touch `public/google0a499a204a55eeb8.html` or `public/718bcb0be670c128fd877ee016f03bef.txt` (`commit.mjs` refuses them anyway), `robots` rules for that path, or any `.env` file.
- Run `npm run build` (and `npm run content:check` for content), then commit.

## Pace and limits

- The SEO autopilot never publishes a new post and never changes a `published` date, so the blog pace rules (`docs/AUTOPILOT.md`) are untouched.
- At most 8 fixes and 5 different posts per run; one fix per commit; a page is changed at most once every 28 days (the queue enforces it).
- Never print env values. Never commit `.env*` files.
