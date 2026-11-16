// Turns stored data into issues (crawl problems), opportunities (Search Console), keyword ideas and
// fix rows. Pure functions: the sync job loads the data and saves the result. Every number in a
// reason comes from the data passed in.
import { BRAND, OFF_LIMITS, RULES, SITE_ORIGIN, contentFileOf, isSafePage, templateOf } from "./config";
import type { AggRow, CwvRow, LinkRow, PageRow } from "./db";
import { clusterFor, intentOf, normalize, overlap, plannedFor, siteTargets, targetFor, words } from "./targets";

export type Severity = "error" | "warning" | "notice";
export type Issue = { path: string; type: string; severity: Severity; detail: string; fix_key: string | null };
export type Fix = { key: string; type: string; risk: "safe" | "risky"; page: string | null; title: string; change: string; reason: string; data: Record<string, unknown> };
export type Opportunity = { kind: "striking" | "low_ctr" | "missing_page" | "cannibal" | "not_indexed" | "losing"; query: string | null; page: string | null; score: number; data: Record<string, unknown>; fix_key: string | null };
export type KeywordIdea = { keyword: string; sources: string[]; intent: string; cluster: string | null; impressions: number; clicks: number; position: number | null; page: string | null; has_page: boolean; data: Record<string, unknown> };

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
const fileNote = (path: string) => (contentFileOf(path) ? ` (${contentFileOf(path)})` : "");

// ---------------------------------------------------------------- crawl issues

/** Status codes that usually mean "bots not welcome", not "page gone". Not counted as broken. */
const BOT_BLOCK = new Set([401, 403, 405, 429, 999]);
/** Broken only after failing on two separate checks (one failure can be a network hiccup). */
const isBroken = (l: LinkRow) =>
  l.fail_count >= 2 && (l.status != null ? l.status >= 400 && !BOT_BLOCK.has(l.status) : !!l.error && /doesn't exist|refused|certificate/i.test(l.error));

export const crawlIssues = (pages: PageRow[], links: LinkRow[], cwv: CwvRow[]) => {
  const live = pages.filter((p) => p.in_sitemap && p.crawled_at);
  const issues: Issue[] = [];
  const fixes: Fix[] = [];
  const add = (path: string, type: string, severity: Severity, detail: string, fix: Omit<Fix, "key" | "page"> & { key?: string } | null) => {
    const key = fix ? fix.key ?? `${fix.type}:${path}` : null;
    issues.push({ path, type, severity, detail, fix_key: key });
    if (fix && key && !fixes.some((f) => f.key === key)) fixes.push({ ...fix, key, page: path });
  };
  const safeOr = (path: string) => (isSafePage(path) ? "safe" : "risky") as Fix["risk"];
  const allDone = live.length >= Math.max(1, pages.filter((p) => p.in_sitemap).length * 0.9);

  // Inbound internal links (from other crawled pages).
  const inbound = new Map<string, Set<string>>();
  for (const p of live) for (const to of p.links_out) if (to !== p.path) (inbound.get(to) ?? inbound.set(to, new Set()).get(to)!).add(p.path);
  const byTitle = new Map<string, string[]>();
  const byDesc = new Map<string, string[]>();
  for (const p of live.filter((x) => x.status === 200)) {
    if (p.title) byTitle.set(p.title, [...(byTitle.get(p.title) ?? []), p.path]);
    if (p.description) byDesc.set(p.description, [...(byDesc.get(p.description) ?? []), p.path]);
  }
  const statusOf = new Map(live.map((p) => [p.path, p.status]));
  const linkStatus = new Map(links.map((l) => [l.url, l]));

  for (const p of live) {
    const t = templateOf(p.path);
    if (!p.status || p.status >= 400) {
      add(p.path, "http-error", "error", p.status ? `The page answers HTTP ${p.status} but is listed in the sitemap.` : `The page could not be loaded: ${p.redirect_to ?? "no answer"}.`, {
        type: "page-status",
        risk: "risky",
        title: `Fix or remove ${p.path} (HTTP ${p.status || "no answer"})`,
        change: "Restore the page, or add a permanent redirect to the closest live page and remove it from the sitemap (src/app/sitemap.ts).",
        reason: `Our crawl got ${p.status ? `HTTP ${p.status}` : "no answer"} for a URL listed in the sitemap.`,
        data: { status: p.status },
      });
      continue;
    }
    if (p.redirect_to) {
      add(p.path, "redirect-in-sitemap", "warning", `Listed in the sitemap but redirects to ${p.redirect_to}.`, {
        type: "sitemap",
        risk: "risky",
        title: `Sitemap lists a redirect: ${p.path}`,
        change: `List ${p.redirect_to} in the sitemap instead of ${p.path} (src/app/sitemap.ts), and update internal links to point straight at it.`,
        reason: `Our crawl followed a redirect from ${p.path} to ${p.redirect_to}.`,
        data: { to: p.redirect_to },
      });
    }
    if (p.noindex) {
      add(p.path, "noindex-in-sitemap", "error", "The page says noindex but is listed in the sitemap.", {
        type: "sitemap",
        risk: "risky",
        title: `noindex page in the sitemap: ${p.path}`,
        change: "Either remove noindex (if the page should rank) or remove the page from the sitemap.",
        reason: "Our crawl found a robots noindex directive on a sitemap URL.",
        data: {},
      });
    }
    const title = p.title ?? "";
    if (!title) {
      add(p.path, "title-missing", "error", "No <title> tag.", { type: "title-meta", risk: safeOr(p.path), title: `Add a title to ${p.path}`, change: `Write a title under ${RULES.titleMax} characters with the page's main keyword near the start${fileNote(p.path)}.`, reason: "Our crawl found no <title>.", data: {} });
    } else if (title.length > RULES.titleMax) {
      add(p.path, "title-long", "warning", `Title is ${title.length} characters (rule: under ${RULES.titleMax}): "${title}".`, {
        type: "title-meta",
        risk: safeOr(p.path),
        title: `Shorten the title of ${p.path}`,
        change: `Rewrite the title (seoTitle) to under ${RULES.titleMax} characters including " | Hamza Tariq", keyword near the start, no clickbait${fileNote(p.path)}.`,
        reason: `Current title is ${title.length} characters: "${title}".`,
        data: { title, length: title.length },
      });
    }
    const desc = p.description ?? "";
    if (!desc) {
      add(p.path, "desc-missing", "error", "No meta description.", { type: "title-meta", risk: safeOr(p.path), title: `Add a meta description to ${p.path}`, change: `Write a ${RULES.descMin}–${RULES.descMax} character description that answers the query and promises what the page delivers${fileNote(p.path)}.`, reason: "Our crawl found no meta description.", data: {} });
    } else if (desc.length < RULES.descMin || desc.length > RULES.descMax) {
      add(p.path, "desc-length", "notice", `Meta description is ${desc.length} characters (rule: ${RULES.descMin}–${RULES.descMax}).`, {
        type: "title-meta",
        risk: safeOr(p.path),
        title: `Fit the meta description of ${p.path} to ${RULES.descMin}–${RULES.descMax} characters`,
        change: `Rewrite the description to ${RULES.descMin}–${RULES.descMax} characters without padding or invented facts${fileNote(p.path)}.`,
        reason: `Current description is ${desc.length} characters.`,
        data: { description: desc, length: desc.length },
      });
    }
    if (allDone && title && (byTitle.get(title)?.length ?? 0) > 1) {
      const others = byTitle.get(title)!.filter((x) => x !== p.path);
      add(p.path, "dup-title", "warning", `Same title as ${others.join(", ")}.`, { type: "title-meta", risk: safeOr(p.path), title: `Make the title of ${p.path} unique`, change: `Rewrite the title so it differs from ${others.join(", ")} and matches this page's own keyword${fileNote(p.path)}.`, reason: `Duplicate title: "${title}".`, data: { others } });
    }
    if (allDone && desc && (byDesc.get(desc)?.length ?? 0) > 1) {
      const others = byDesc.get(desc)!.filter((x) => x !== p.path);
      add(p.path, "dup-desc", "warning", `Same meta description as ${others.join(", ")}.`, { type: "title-meta", risk: safeOr(p.path), title: `Make the description of ${p.path} unique`, change: `Rewrite the meta description so it differs from ${others.join(", ")}${fileNote(p.path)}.`, reason: "Duplicate meta description.", data: { others } });
    }
    if (!p.canonical) {
      add(p.path, "canonical-missing", "warning", "No canonical link.", { type: "code", risk: "risky", title: `Add a canonical URL to ${p.path}`, change: "Export metadata with alternates.canonical for this route.", reason: "Our crawl found no <link rel=canonical>.", data: {} });
    } else {
      const canon = (() => {
        try {
          return new URL(p.canonical).pathname.replace(/\/+$/, "") || "/";
        } catch {
          return p.canonical;
        }
      })();
      if (canon !== p.path) add(p.path, "canonical-other", "warning", `Canonical points to ${p.canonical}.`, { type: "code", risk: "risky", title: `Canonical of ${p.path} points elsewhere`, change: `Point the canonical at the page itself, unless ${canon} is meant to replace it (then redirect and drop it from the sitemap).`, reason: `Canonical is ${p.canonical}.`, data: { canonical: p.canonical } });
    }
    if (!p.has_og) add(p.path, "og-missing", "warning", "Missing og:title or og:image.", { type: "code", risk: "risky", title: `Add Open Graph tags to ${p.path}`, change: "Give the route an opengraph-image.tsx (renderOg) and openGraph metadata.", reason: "Our crawl found no og:title/og:image.", data: {} });
    if (!p.has_jsonld) add(p.path, "jsonld-missing", "notice", "No JSON-LD structured data.", { type: "code", risk: "risky", title: `Add structured data to ${p.path}`, change: "Add a fitting JSON-LD node via jsonLd() that references #person.", reason: "Our crawl found no application/ld+json script.", data: {} });
    if (p.h1_count !== 1) add(p.path, "h1-count", "warning", p.h1_count ? `${p.h1_count} H1 headings (should be one).` : "No H1 heading.", { type: "code", risk: "risky", title: `${p.path} has ${p.h1_count} H1 headings`, change: "Keep exactly one H1 with the page's main keyword.", reason: `Our crawl counted ${p.h1_count} <h1> elements.`, data: { h1: p.h1_count } });
    if ((p.images_missing_alt ?? 0) > 0)
      add(p.path, "alt-missing", "warning", `${p.images_missing_alt} image(s) without an alt attribute.`, {
        type: "alt-text",
        risk: safeOr(p.path),
        title: `Add alt text to ${p.images_missing_alt} image(s) on ${p.path}`,
        change: `Give every image a descriptive alt (or alt="" if purely decorative)${fileNote(p.path)}.`,
        reason: `Our crawl found ${p.images_missing_alt} <img> without alt.`,
        data: { count: p.images_missing_alt },
      });
    const thin = RULES.thinWords[t] ?? RULES.thinWords.default;
    // Tools, the home page, listings and project pages are short by design (project pages describe
    // only what projects.ts says; padding them would mean inventing facts).
    if ((p.words ?? 0) < thin && !["tool", "home", "work", "blog-category", "blog-index", "work-index"].includes(t))
      add(p.path, "thin", t === "blog-post" ? "warning" : "notice", `${p.words} words of readable text without JavaScript (rule: ${thin}+).`, {
        type: "refresh-post",
        risk: safeOr(p.path),
        title: `Expand thin page ${p.path}`,
        change: isSafePage(p.path) ? `Refresh the post to full STYLE.md standard: answer the brief's questions, add information gain${fileNote(p.path)}. Set updated: to today.` : "Add useful, real content (owner facts only) so the page answers its keyword fully.",
        reason: `Our crawl counted ${p.words} words in the server-rendered HTML.`,
        data: { words: p.words },
      });
    if (allDone && p.path !== "/" && !inbound.get(p.path)?.size)
      add(p.path, "orphan", "warning", "No other page links here.", {
        type: "internal-links",
        risk: safeOr(p.path),
        title: `Link to orphan page ${p.path}`,
        change: isSafePage(p.path) ? "Add one natural sentence with a descriptive link to this post in 2–3 related older posts (same cluster first)." : "Link this page from a related page or the menu/footer.",
        reason: "Our crawl found no internal link to it from any other sitemap page.",
        data: {},
      });
    if ((p.response_ms ?? 0) > RULES.slowResponseMs)
      add(p.path, "slow-response", "notice", `HTML took ${p.response_ms} ms to arrive in our crawl (rule: under ${RULES.slowResponseMs} ms).`, { type: "performance", risk: "risky", title: `Slow server response on ${p.path}`, change: "Check that the route is statically generated (no request data), and that nothing slow runs on render.", reason: `Our crawl measured ${p.response_ms} ms for the HTML.`, data: { ms: p.response_ms } });

    // Broken links on this page.
    const broken: string[] = [];
    for (const to of p.links_out) {
      const st = statusOf.get(to);
      const l = linkStatus.get(`${SITE_ORIGIN}${to}`);
      if ((st != null && (st === 0 || st >= 400)) || (st == null && l && isBroken(l))) broken.push(to);
    }
    if (broken.length)
      add(p.path, "broken-link", "error", `Links to missing page(s): ${broken.join(", ")}.`, {
        type: "broken-link",
        risk: safeOr(p.path),
        title: `Fix ${broken.length} broken internal link(s) on ${p.path}`,
        change: `Point each link at the right live page (or remove it): ${broken.join(", ")}${fileNote(p.path)}.`,
        reason: "Our crawl got an error status for these internal links.",
        data: { links: broken },
      });
    const badOut = p.external_links.filter((u) => {
      const l = linkStatus.get(u);
      return l && isBroken(l);
    });
    if (badOut.length)
      add(p.path, "broken-outside-link", "warning", `Outside link(s) not working: ${badOut.join(", ")}.`, {
        type: "broken-link",
        risk: safeOr(p.path),
        key: `broken-outside-link:${p.path}`,
        title: `Replace ${badOut.length} broken outside link(s) on ${p.path}`,
        change: `Replace each with an equivalent official source (trusted domains in docs/AUTOPILOT.md) or remove it: ${badOut.join(", ")}${fileNote(p.path)}.`,
        reason: badOut.map((u) => `${u}: ${linkStatus.get(u)?.status ?? linkStatus.get(u)?.error}`).join("; "),
        data: { links: badOut },
      });
  }

  // Core Web Vitals per template (lab score and CrUX field category).
  for (const c of cwv) {
    const min = RULES.minPerformance[c.template] ?? RULES.minPerformance.default;
    const slowField = c.field_category === "SLOW" || c.field_category === "AVERAGE";
    if ((c.performance != null && c.performance < min) || slowField)
      add(c.url, "slow-template", c.field_category === "SLOW" ? "error" : "warning", `${c.template} template: Lighthouse mobile ${c.performance ?? "n/a"} (rule: ${min}+)${c.field_category ? `, real users (${c.field_source}) ${c.field_category}` : ""}.`, {
        type: "performance",
        risk: "risky",
        key: `performance:${c.template}`,
        title: `Speed up the ${c.template} template`,
        change: "Find what makes LCP/INP/CLS slow on this template (PageSpeed diagnostics) and fix it in the components.",
        reason: `PageSpeed on ${c.url} (${c.day}): performance ${c.performance ?? "n/a"}, lab LCP ${c.lab_lcp_ms ?? "n/a"} ms, TBT ${c.lab_tbt_ms ?? "n/a"} ms, CLS ${c.lab_cls ?? "n/a"}${c.field_category ? `; field LCP ${c.field_lcp_ms ?? "n/a"} ms, INP ${c.field_inp_ms ?? "n/a"} ms, CLS ${c.field_cls ?? "n/a"} (${c.field_category})` : ""}.`,
        data: { ...c },
      });
  }
  return { issues, fixes };
};

// ---------------------------------------------------------------- Search Console opportunities

export type SearchData = {
  range: { from: string; to: string };
  pairs: AggRow[]; // page x query, last 28 days
  pages: AggRow[]; // pages, last 28 days
  pagesPrev: AggRow[]; // pages, the 28 days before
  queries: AggRow[]; // queries, last 28 days
  queries90: AggRow[]; // queries, last 90 days (the site's own CTR per position)
  bingQueries: AggRow[]; // Bing queries, last 90 days
};

const bucketOf = (pos: number) => (pos <= 3 ? "1-3" : pos <= 7 ? "4-7" : pos <= 10 ? "8-10" : pos <= 20 ? "11-20" : "21+");

export const searchOpportunities = (d: SearchData, pages: PageRow[]) => {
  const opps: Opportunity[] = [];
  const fixes: Fix[] = [];
  const range = `Search Console, ${d.range.from} to ${d.range.to}`;
  const addFix = (f: Fix) => {
    if (!fixes.some((x) => x.key === f.key)) fixes.push(f);
    return f.key;
  };
  const targets = siteTargets();
  const postOf = (path: string) => targets.find((t) => t.path === path && t.kind === "post");
  const daysSince = (day?: string) => (day ? (Date.parse(d.range.to) - Date.parse(day)) / 86_400_000 : Infinity);

  // Top page per query.
  const byQuery = new Map<string, AggRow[]>();
  for (const r of d.pairs) byQuery.set(r.query, [...(byQuery.get(r.query) ?? []), r]);

  // a) Striking distance.
  for (const [query, rows] of byQuery) {
    const top = [...rows].sort((a, b) => b.impressions - a.impressions)[0];
    const total = rows.reduce((n, r) => n + r.impressions, 0);
    if (!top.position || top.position < RULES.striking.from || top.position > RULES.striking.to || total < RULES.striking.minImpressions || BRAND.test(query)) continue;
    const post = postOf(top.page);
    const covered = post ? post.phrases.some((p) => overlap(query, p) >= 0.6) : false;
    const reason = `"${query}": position ${top.position} on ${top.page}, ${top.impressions} impressions, ${top.clicks} clicks (${range}).`;
    const key = isSafePage(top.page)
      ? addFix(covered
          ? { key: `internal-links:${top.page}:${normalize(query)}`, type: "internal-links", risk: "safe", page: top.page, title: `Push "${query}" up: links to ${top.page}`, change: `The post already answers "${query}". Add one natural sentence linking to it with "${query}" (or a close variant) as anchor text in 2–3 related older posts, and make sure the answer sits high in its section${fileNote(top.page)}.`, reason, data: { query, position: top.position, impressions: top.impressions, clicks: top.clicks } }
          : { key: `secondary-faq:${top.page}:${normalize(query)}`, type: "secondary-faq", risk: "safe", page: top.page, title: `Answer "${query}" in ${top.page}`, change: `Add "${query}" to the post's secondary keywords and answer it in a new H2 or FAQ item (real facts only), and add it to the brief's "Questions to answer"${fileNote(top.page)}.`, reason, data: { query, position: top.position, impressions: top.impressions, clicks: top.clicks } })
      : addFix({ key: `page-copy:${top.page}:${normalize(query)}`, type: "page-copy", risk: "risky", page: top.page, title: `Strengthen ${top.page} for "${query}"`, change: `Cover "${query}" on the page (a FAQ item or a section) using owner facts only; keep the page's own main keyword.`, reason, data: { query, position: top.position, impressions: top.impressions } });
    opps.push({ kind: "striking", query, page: top.page, score: top.impressions * (21 - top.position), data: { position: top.position, impressions: top.impressions, clicks: top.clicks, answered: covered }, fix_key: key });
  }

  // b) Low CTR vs the site's own CTR at that position.
  const bucket = new Map<string, { c: number; i: number }>();
  for (const r of d.queries90) {
    if (!r.position) continue;
    const b = bucket.get(bucketOf(r.position)) ?? { c: 0, i: 0 };
    b.c += r.clicks;
    b.i += r.impressions;
    bucket.set(bucketOf(r.position), b);
  }
  for (const p of d.pages) {
    if (p.impressions < RULES.lowCtr.minImpressions || !p.position) continue;
    const b = bucket.get(bucketOf(p.position));
    const ctr = p.clicks / p.impressions;
    const expected = b && b.i >= RULES.lowCtr.minBucketImpressions ? b.c / b.i : null;
    const low = expected != null ? ctr < expected * RULES.lowCtr.ratio : ctr < RULES.lowCtr.fallbackCtr;
    if (!low) continue;
    const reason = `${p.page}: ${p.impressions} impressions, ${p.clicks} clicks (CTR ${pct(ctr)}) at average position ${p.position}; ${expected != null ? `the site's own CTR at positions ${bucketOf(p.position)} is ${pct(expected)} over 90 days` : `rule: under ${pct(RULES.lowCtr.fallbackCtr)} with ${RULES.lowCtr.minImpressions}+ impressions (not enough site data per position yet)`} (${range}).`;
    const key = addFix({
      key: `title-meta:${p.page}`,
      type: "title-meta",
      risk: isSafePage(p.page) ? "safe" : "risky",
      page: p.page,
      title: `Rewrite title and description of ${p.page} (low CTR)`,
      change: `Rewrite seoTitle and description so they promise exactly what the page delivers for its top queries: keyword near the start, a specific benefit, title under 60 characters, description 150–160, no clickbait. Note the old title and today's date in the brief${fileNote(p.page)}.`,
      reason,
      data: { impressions: p.impressions, clicks: p.clicks, ctr, expected, position: p.position, topQueries: (d.pairs.filter((r) => r.page === p.page).sort((a, b) => b.impressions - a.impressions).slice(0, 5)).map((r) => r.query) },
    });
    opps.push({ kind: "low_ctr", query: null, page: p.page, score: p.impressions * ((expected ?? RULES.lowCtr.fallbackCtr) - ctr), data: { impressions: p.impressions, clicks: p.clicks, ctr, expected, position: p.position }, fix_key: key });
  }

  // c) Missing pages: queries no page targets and no backlog topic covers.
  for (const q of d.queries) {
    if (q.impressions < RULES.missingMinImpressions || BRAND.test(q.query) || OFF_LIMITS.test(q.query) || words(q.query).length < 2) continue;
    if (targetFor(q.query) || plannedFor(q.query)) continue;
    const cluster = clusterFor(q.query);
    const key = addFix({
      key: `backlog-add:${normalize(q.query)}`,
      type: "backlog-add",
      risk: "safe",
      page: null,
      title: `Add "${q.query}" to the blog backlog`,
      change: `Add a supporting topic for "${q.query}" to content/backlog.json${cluster ? ` in cluster ${cluster}` : " (pick the best cluster with room)"} with intent ${intentOf(q.query)}, 3–6 secondary keywords, 2–6 questions, reader and angle (refill.mjs --add). The blog autopilot writes it at its own pace.`,
      reason: `"${q.query}": ${q.impressions} impressions, ${q.clicks} clicks, average position ${q.position ?? "n/a"} with no page targeting it (${range}).`,
      data: { keyword: q.query, cluster, intent: intentOf(q.query), impressions: q.impressions, position: q.position, rankingPage: byQuery.get(q.query)?.sort((a, b) => b.impressions - a.impressions)[0]?.page ?? null },
    });
    opps.push({ kind: "missing_page", query: q.query, page: byQuery.get(q.query)?.[0]?.page ?? null, score: q.impressions, data: { impressions: q.impressions, clicks: q.clicks, position: q.position, cluster }, fix_key: key });
  }

  // d) Cannibalisation.
  for (const [query, rows] of byQuery) {
    const total = rows.reduce((n, r) => n + r.impressions, 0);
    if (total < RULES.cannibal.minImpressions || BRAND.test(query)) continue;
    const competing = rows.filter((r) => r.impressions / total >= RULES.cannibal.minShare).sort((a, b) => b.impressions - a.impressions);
    if (competing.length < 2) continue;
    const owner = competing.find((r) => { const t = targets.find((x) => x.path === r.page); return t && overlap(query, t.keyword) >= 0.6; }) ?? [...competing].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)[0];
    const others = competing.filter((r) => r.page !== owner.page);
    const key = addFix({
      key: `cannibal:${normalize(query)}`,
      type: "cannibal",
      risk: "risky",
      page: owner.page,
      title: `Two pages compete for "${query}"`,
      change: `Make ${owner.page} the page for "${query}". In ${others.map((o) => o.page).join(", ")}: link to it with the query as anchor text and move the overlapping section there. If they are near-duplicates, merge into ${owner.page} and add a permanent redirect (next.config.ts).`,
      reason: competing.map((r) => `${r.page}: ${r.impressions} impressions, ${r.clicks} clicks, position ${r.position}`).join("; ") + ` (${range}).`,
      data: { query, owner: owner.page, pages: competing },
    });
    opps.push({ kind: "cannibal", query, page: owner.page, score: total, data: { pages: competing }, fix_key: key });
  }

  // e) Not indexed (URL Inspection).
  for (const p of pages.filter((x) => x.in_sitemap && x.inspected_at && x.index_verdict && x.index_verdict !== "PASS")) {
    const post = postOf(p.path);
    const young = post && daysSince(post.published) < RULES.indexGraceDays;
    const state = p.coverage_state ?? p.index_verdict ?? "Unknown";
    const soft = /crawled - currently not indexed|discovered - currently not indexed|unknown to google/i.test(state);
    let key: string | null = null;
    const unknown = /unknown to google/i.test(state);
    if (!young && !(unknown && !isSafePage(p.path))) {
      key = isSafePage(p.path) && soft
        ? addFix({ key: `index:${p.path}`, type: "internal-links", risk: "safe", page: p.path, title: `Get ${p.path} indexed`, change: `Add descriptive links to it from 2–3 related older posts, and refresh the post (answer the brief's questions better, add information gain, set updated: to today)${fileNote(p.path)}.`, reason: `URL Inspection: "${state}" (checked ${p.inspected_at?.slice(0, 10)}).`, data: { state } })
        : addFix({ key: `index:${p.path}`, type: "index", risk: "risky", page: p.path, title: `Not indexed: ${p.path}`, change: `Google says "${state}". Find the cause (robots, noindex, canonical, redirect, sitemap or thin content) and fix it.`, reason: `URL Inspection: "${state}", robots ${p.robots_state ?? "n/a"}, fetch ${p.page_fetch_state ?? "n/a"}, Google canonical ${p.google_canonical ?? "n/a"} (checked ${p.inspected_at?.slice(0, 10)}).`, data: { state, robots: p.robots_state, fetch: p.page_fetch_state, googleCanonical: p.google_canonical } });
    }
    opps.push({ kind: "not_indexed", query: null, page: p.path, score: 1, data: { state, robots: p.robots_state, fetch: p.page_fetch_state, lastCrawl: p.last_google_crawl, young: !!young }, fix_key: key });
  }

  // f) Losing clicks month over month (28 days vs the 28 before).
  const prev = new Map(d.pagesPrev.map((r) => [r.page, r]));
  for (const p of d.pages) {
    const before = prev.get(p.page);
    if (!before || before.clicks < RULES.losing.minClicks || p.clicks > before.clicks * (1 - RULES.losing.drop)) continue;
    const reason = `${p.page}: ${before.clicks} → ${p.clicks} clicks, position ${before.position ?? "n/a"} → ${p.position ?? "n/a"} (28 days to ${d.range.to} vs the 28 before).`;
    const key = addFix(isSafePage(p.page)
      ? { key: `refresh-post:${p.page}`, type: "refresh-post", risk: "safe", page: p.page, title: `Refresh ${p.page} (losing clicks)`, change: `Refresh the post: check its top queries are answered, update facts from content/owner/, add a second kind of information gain if missing, set updated: to today${fileNote(p.page)}.`, reason, data: { before, after: p } }
      : { key: `page-copy:${p.page}:losing`, type: "page-copy", risk: "risky", page: p.page, title: `${p.page} is losing clicks`, change: "Review what changed (titles, content, competitors) and update the page with owner facts only.", reason, data: { before, after: p } });
    opps.push({ kind: "losing", query: null, page: p.page, score: before.clicks - p.clicks, data: { before: before.clicks, after: p.clicks, positionBefore: before.position, positionAfter: p.position }, fix_key: key });
  }

  return { opps, fixes };
};

// ---------------------------------------------------------------- keyword ideas

export const keywordIdeas = (d: SearchData | null, bingRelated: { seed: string; keyword: string; impressions: number }[]) => {
  const ideas = new Map<string, KeywordIdea>();
  const best = new Map<string, AggRow>();
  for (const r of d?.pairs ?? []) if ((best.get(r.query)?.impressions ?? -1) < r.impressions) best.set(r.query, r);
  const topPage = new Map([...best].map(([q, r]) => [q, r.page]));
  const put = (keyword: string, source: string, n: { impressions?: number; clicks?: number; position?: number | null; seed?: string }) => {
    const k = keyword.toLowerCase().replace(/\s+/g, " ").trim();
    if (!k || BRAND.test(k) || OFF_LIMITS.test(k) || words(k).length < 2 || k.length > 120) return;
    const target = targetFor(k);
    if (target?.target.kind === "project") return; // a client's own name: navigational, not a topic
    const planned = plannedFor(k);
    const cur = ideas.get(k) ?? {
      keyword: k,
      sources: [],
      intent: intentOf(k),
      cluster: clusterFor(k) ?? target?.target.cluster ?? null,
      impressions: 0,
      clicks: 0,
      position: null,
      page: topPage.get(keyword) ?? target?.target.path ?? null,
      has_page: !!target,
      data: { planned: planned?.keyword ?? null, target: target?.target.path ?? null, targetIsMain: !!target?.main },
    };
    if (!cur.sources.includes(source)) cur.sources.push(source);
    if (source === "google") {
      cur.impressions = n.impressions ?? 0;
      cur.clicks = n.clicks ?? 0;
      cur.position = n.position ?? null;
    } else if (source === "bing") cur.data = { ...cur.data, bingImpressions: n.impressions ?? 0, bingClicks: n.clicks ?? 0 };
    else cur.data = { ...cur.data, bingRelatedImpressions: n.impressions ?? 0, seed: n.seed };
    ideas.set(k, cur);
  };
  for (const q of d?.queries ?? []) if (q.impressions >= RULES.ideaMinImpressions) put(q.query, "google", q);
  for (const q of d?.bingQueries ?? []) if (q.impressions >= RULES.ideaMinImpressions) put(q.query, "bing", q);
  for (const r of bingRelated) put(r.keyword, "bing-related", { impressions: r.impressions, seed: r.seed });
  return [...ideas.values()].sort((a, b) => b.impressions - a.impressions).slice(0, 400);
};
