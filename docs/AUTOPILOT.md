# Content autopilot

A scheduled Claude Code session writes one blog post every other day, checks it, and publishes it. Once a month it refreshes posts that are close to page one and writes a report. This file is the session's instructions: point the schedule at it.

## Schedule (owner sets this up)

| Job | When | Prompt for the scheduled session |
| --- | --- | --- |
| Post | Every other day, 09:00 PKT | `Run the "Every run" steps in docs/AUTOPILOT.md.` |
| Monthly | 1st of each month, 10:00 PKT | `Run the "Monthly" steps in docs/AUTOPILOT.md.` |

Use `/schedule` in Claude Code (cloud routine on this repo) or any cron that runs `claude -p "<prompt>"` in a checkout with push access. The session needs the env vars below and `gh` logged in (for pull requests).

**Pace:** one post every 2 days, max 4 per ISO week (CLAUDE.md content rules, checked by `content:check`). `next-topic` dates each post 2 days after the latest one; when that date is more than 2 days away (posts are already scheduled), the run ends without writing. The blog shows a post on its date (the site revalidates daily).

## Env vars

| Name | Used for | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVER_SECRET` | Assistant top questions, leads per source | Yes (already in `.env.local`) |
| `GSC_SERVICE_ACCOUNT_JSON` | Search Console queries and positions (service account JSON, raw or base64) | Optional (not set up yet: refills use the assistant's questions only, monthly reports skip Search Console) |
| `GSC_SITE_URL` | Search Console property, default `sc-domain:hamzatariq.site` | Optional |

Search Console setup: create a service account in Google Cloud, enable the "Google Search Console API", download its JSON key, and add the service account email as a user (Restricted is enough) on the hamzatariq.site property.

## Every run

1. `git checkout main && git pull --ff-only`, then `npm ci` if `package-lock.json` changed.
2. `node scripts/autopilot/next-topic.mjs`
   - `skip` → if it also says `"refill": true`, do step 8, then stop. Otherwise stop: nothing to do today.
   - Otherwise you get `topic` (keyword, title, category, reader, targetPage), `publish` (the date for the post) and the list of existing posts.
3. Read `content/STYLE.md` (all rules), `content/owner/profile.md`, `content/owner/projects/*.md`, `src/data/caseStudies.ts` and `src/data/services.ts`. **These are the only sources of facts and numbers.** Never invent clients, results, quotes or statistics. If the topic needs a fact that isn't there, set `"blockedBy": "TODO(owner): …"` on the backlog item, add the question to `OWNER_TODO.md`, commit those two files, and go back to step 2 for the next topic.
4. Write `content/blog/<slug>.mdx`:
   - slug = the keyword in kebab case (`next.js` → `nextjs`), frontmatter as in STYLE.md, `published: <publish>`, `category` from the topic.
   - Answer the title's question in the first 2–3 lines; 1300–2000 words; 5–8 H2s; keyword in the title (or `seoTitle`), slug, first paragraph and one H2.
   - At least one `<FromMyWork>` box with a real example; 4–5 FAQ items; 3+ internal links (one to `targetPage`) and 1–2 links to official docs or Google Search Central. Link to related existing posts where it helps the reader.
5. `npm run content:check -- <slug>` (checks outside links too). Fix every error.
6. `npm run build`. It must pass.
7. Publish:
   - All green → `node scripts/autopilot/finish.mjs <slug>` (updates the backlog, commits, pushes to `main`; Vercel deploys, IndexNow and the assistant's embeddings run on deploy).
   - Something still fails → fix it and run steps 5–6 **once** more. If it still fails, `node scripts/autopilot/finish.mjs <slug> --pr "<what failed>"` opens a pull request instead, and nothing goes live.
8. Refill (when `refill` is true):
   - `node scripts/autopilot/refill.mjs` returns real demand: the questions visitors ask the AI assistant most, plus Search Console queries the site already shows up for once `GSC_SERVICE_ACCOUNT_JSON` is set (until then that part reports an error; ignore it). If there are too few real questions for 15 topics, add only as many as the data supports and fill the rest from the categories' service pages (questions a buyer of that service would search for).
   - Turn the best of them into **15 new topics**: one main keyword each, matching one of the five categories, a mix of hiring, problem, local and recruiter intent, not overlapping existing posts or service pages. Prefer queries with impressions and questions asked more than once. Topics that need a missing owner fact get `blockedBy`.
   - Save them as a JSON array (`[{ "keyword", "title", "category", "reader", "source" }]`) in a temp file, run `node scripts/autopilot/refill.mjs --add <file>`, then `npm run content:check` (backlog check) and commit `content/backlog.json` with the message `Backlog: add N topics`, and push.

## Monthly

1. Pull `main` as above.
2. `node scripts/autopilot/monthly.mjs` (previous month) gives: posts published, blog posts at positions 8–20 with impressions, top pages and queries, and leads per source.
3. Refresh up to 3 posts from `refresh` (most impressions first):
   - Check which queries the page ranks for (`gscQuery` with dimensions `page,query`, or the Search Console UI) and make sure the post answers them clearly, in an H2 or an FAQ item.
   - Update facts that changed (prices, results) from `content/owner/`, improve the intro, add internal links from newer posts, and set `updated:` to today.
   - Keep the slug and main keyword. Run `npm run content:check -- <slug>` and `npm run build`.
4. Write `reports/YYYY-MM.md` using the template below, with only numbers from the script output.
5. Commit the refreshed posts and the report together: `Monthly content report YYYY-MM`. Push to `main` (or open a PR if a check fails after one retry).

### Report template

```markdown
# Content report: <Month YYYY>

## Summary
<3–4 lines: posts published, clicks and impressions trend, leads by source, what changed.>

## Published this month
- <title> (/blog/<slug>), published <date>

## Refreshed (positions 8–20)
| Post | Position | Impressions | What changed |

## Search Console (<range>)
Top pages and top queries tables.

## Leads by source
| Source | Leads |

## Next month
<Topics queued next, anything blocked on the owner (from OWNER_TODO.md).>
```

## Safety rules

- Never print env values. Never commit `.env*` files.
- Never edit or delete `public/google0a499a204a55eeb8.html` or the IndexNow key file.
- Only `content/blog/`, `content/backlog.json`, `public/images/blog/`, `reports/` and `OWNER_TODO.md` change in autopilot commits.
- One post per run. If anything is unclear or a fact is missing, block the topic instead of guessing.
