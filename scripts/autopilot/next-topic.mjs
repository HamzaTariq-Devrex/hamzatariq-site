// Prints the next blog topic for the autopilot as JSON (stdout), or {"skip": reason}.
// The topic is the first "queued" backlog item without blockedBy. The publish date respects the
// pace from CLAUDE.md: at least 2 days after the latest post, max 4 per week.
//
//   node scripts/autopilot/next-topic.mjs
import { MAX_POSTS_PER_WEEK, MIN_QUEUED, addDays, isoWeek, nextPublishDate, readBacklog, readPosts, todayPkt } from "./lib.mjs";

const backlog = readBacklog();
const posts = readPosts();
const queued = backlog.items.filter((i) => i.status === "queued" && !i.blockedBy);
const today = todayPkt();
const publish = nextPublishDate(posts, today);

const out = (data) => console.log(JSON.stringify(data, null, 2));

// Write only when the post goes live within 2 days; otherwise posts are already scheduled far enough ahead.
if (publish > addDays(today, 2)) {
  out({ skip: `The next free publish date is ${publish} (one post every 2 days, max ${MAX_POSTS_PER_WEEK} per week, ${isoWeek(publish)}). Nothing to write today.`, queued: queued.length, refill: queued.length < MIN_QUEUED });
} else if (!queued.length) {
  out({ skip: "No queued topics without a blockedBy note. Run the refill step.", queued: 0, refill: true });
} else {
  const topic = queued[0];
  out({
    topic,
    publish,
    queued: queued.length,
    refill: queued.length - 1 < MIN_QUEUED,
    existingPosts: posts.map((p) => ({ slug: p.slug, title: p.title, keyword: p.keyword })),
  });
}
