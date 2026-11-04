// Prints the next autopilot job as JSON (stdout), or {"skip": reason}.
//
//   1. A pillar marked "expand" in the backlog (the post exists but is shorter than a pillar):
//      {"job": "expand-pillar", ...}. No new post, so no publish date is needed.
//   2. Otherwise the first "queued" backlog item without blockedBy: {"job": "new-post", ...} with a
//      publish date that respects the pace from CLAUDE.md (2+ days after the latest post, max 4/week).
//
// Both include the cluster context the writer needs for internal linking: the pillar, sibling posts,
// the service page, older posts that should link to the new one, and where the SERP brief goes.
//
//   node scripts/autopilot/next-topic.mjs
import { MAX_POSTS_PER_WEEK, MIN_QUEUED, addDays, briefPath, isoWeek, nextPublishDate, readBacklog, readClusters, readPosts, slugFor, todayPkt } from "./lib.mjs";

const backlog = readBacklog();
const posts = readPosts();
const clusters = readClusters();
const queued = backlog.items.filter((i) => i.status === "queued" && !i.blockedBy);
const today = todayPkt();
const publish = nextPublishDate(posts, today);
const out = (data) => console.log(JSON.stringify(data, null, 2));

/** Internal-linking context for a topic in a cluster, as of a publish date. */
const contextFor = (item, date) => {
  const cluster = clusters.find((c) => c.id === item.cluster);
  const inCluster = posts.filter((p) => p.cluster === item.cluster && p.slug !== item.publishedSlug);
  const pillarPost = posts.find((p) => p.slug === cluster.pillar.slug) ?? null;
  const older = posts.filter((p) => p.published && p.published <= date && p.slug !== item.publishedSlug);
  // Older posts that should link to the new one: same cluster first, then same category, newest first.
  const backlinkCandidates = older
    .map((p) => ({ ...p, score: (p.cluster === item.cluster ? 2 : 0) + (p.category === item.category ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || b.published.localeCompare(a.published))
    .slice(0, 5)
    .map(({ slug, title, cluster: c }) => ({ slug, title, cluster: c }));
  return {
    cluster: { id: cluster.id, name: cluster.name, servicePage: cluster.servicePage },
    pillar: { slug: cluster.pillar.slug, exists: !!pillarPost, published: pillarPost?.published ?? null },
    siblings: inCluster.filter((p) => p.slug !== cluster.pillar.slug).map((p) => ({ slug: p.slug, title: p.title, published: p.published })),
    backlinkCandidates,
    slug: item.publishedSlug ?? (item.role === "pillar" ? cluster.pillar.slug : slugFor(item.keyword)),
    brief: briefPath(item.publishedSlug ?? (item.role === "pillar" ? cluster.pillar.slug : slugFor(item.keyword))),
  };
};

const expand = backlog.items.find((i) => i.expand && i.status === "published" && i.role === "pillar");
if (expand) {
  out({ job: "expand-pillar", topic: expand, ...contextFor(expand, today), existingPosts: posts.map((p) => ({ slug: p.slug, title: p.title, keyword: p.keyword, cluster: p.cluster })) });
} else if (publish > addDays(today, 2)) {
  // Write only when the post goes live within 2 days; otherwise posts are already scheduled far enough ahead.
  out({ skip: `The next free publish date is ${publish} (one post every 2 days, max ${MAX_POSTS_PER_WEEK} per week, ${isoWeek(publish)}). Nothing to write today.`, queued: queued.length, refill: queued.length < MIN_QUEUED });
} else if (!queued.length) {
  out({ skip: "No queued topics without a blockedBy note. Run the refill step.", queued: 0, refill: true });
} else {
  const topic = queued[0];
  out({
    job: "new-post",
    topic,
    publish,
    ...contextFor(topic, publish),
    queued: queued.length,
    refill: queued.length - 1 < MIN_QUEUED,
    existingPosts: posts.map((p) => ({ slug: p.slug, title: p.title, keyword: p.keyword, cluster: p.cluster })),
  });
}
