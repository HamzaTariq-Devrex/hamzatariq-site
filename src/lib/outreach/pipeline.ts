// The outreach jobs.
// - discoverAll(): daily (Vercel Cron), continued by the tick — saved searches → new prospects,
//   max 150 per day, rotating: the searches that ran longest ago go first.
// - tick(): every few minutes (GitHub Actions) — hourly inbox check, safety checks, at most ONE email
//   per tick, drafts, follow-ups and one audit, inside a time budget.
import { SITE } from "@/lib/site";
import { rpcClient, serverSecret } from "@/lib/supabase/server";
import { sendOwnerAlert } from "@/lib/leads/email";
import { ox, type Prospect, type State } from "./db";
import { discover } from "./osm";
import { qualify } from "./qualify";
import { draftFirst, draftFollowUp, postalAddress, reportUrl, topProblems } from "./compose";
import { readInbox, sendOutreach } from "./mail";

/** Discovery is separate from sending: up to 150 new businesses a day across all saved searches. */
export const MAX_NEW_PER_DAY = 150;
/** Per search per run, so one big city doesn't use the whole day's budget. */
const PER_SEARCH = 25;
const DAY = 86_400_000;

/** Gmail-safe ramp: 15/day in week 1, 20/day in week 2, then 30/day. */
export const dailyCap = (startedAt: string | null, now = Date.now()) => {
  if (!startedAt) return 15;
  const days = (now - Date.parse(startedAt)) / DAY;
  return days < 7 ? 15 : days < 14 ? 20 : 30;
};

/** Monday–Friday, 9:00–17:00 in the recipient's time zone. */
export const inSendingWindow = (timezone: string, now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "numeric", hour12: false }).formatToParts(now);
  const day = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  return !["Sat", "Sun"].includes(day) && hour >= 9 && hour < 17;
};

const randomGapMs = () => (3 + Math.random() * 5) * 60_000;

/** Searches in rotation order: never run first, then the one that ran longest ago. */
const rotation = (state: State) =>
  state.searches
    .filter((s) => s.country !== "US")
    .sort((a, b) => (a.last_run_at ? Date.parse(a.last_run_at) : 0) - (b.last_run_at ? Date.parse(b.last_run_at) : 0));

/**
 * Runs saved searches in rotation until today's budget (150) is used or time runs out. A search
 * that ran in the last 20 hours waits for the next day, so every search gets its turn.
 */
export const discoverAll = async (onlySearch?: string, deadline = Date.now() + 50_000) => {
  const state = await ox.state();
  let budget = Math.max(0, MAX_NEW_PER_DAY - state.found_24h);
  const searches = onlySearch
    ? state.searches.filter((s) => s.id === onlySearch)
    : rotation(state).filter((s) => !s.last_run_at || Date.now() - Date.parse(s.last_run_at) > 20 * 3_600_000);
  const results: { search: string; added: number; error?: string }[] = [];
  for (const s of searches) {
    // An Overpass call can take up to ~30 seconds on a busy day.
    if (budget <= 0 || deadline - Date.now() < 30_000) break;
    try {
      const added = await discover(s, Math.min(budget, PER_SEARCH));
      budget -= added;
      results.push({ search: `${s.business_type}, ${s.city}`, added });
    } catch (e) {
      results.push({ search: `${s.business_type}, ${s.city}`, added: 0, error: (e as Error).message });
    }
  }
  return results;
};
/** Pauses outreach on more than 3% bounces or any complaint in the last 7 days, and emails Hamza once. */
const safetyCheck = async (state: State) => {
  if (state.settings.paused) return state.settings.pause_reason ?? "paused";
  const rate = state.sent_7d ? state.bounces_7d / state.sent_7d : 0;
  let reason: string | null = null;
  if (state.complaints_7d > 0) reason = `Spam complaint in the last 7 days (${state.complaints_7d}).`;
  else if (state.bounces_7d > 0 && rate > 0.03) reason = `Bounce rate ${(rate * 100).toFixed(1)}% in the last 7 days (${state.bounces_7d} of ${state.sent_7d}).`;
  if (!reason) return null;
  await ox.set({ paused: true, pause_reason: `Auto-paused: ${reason}` });
  await sendOwnerAlert("Outreach auto-paused", [`Outreach was paused automatically. ${reason}`, `Check the list and resume in ${SITE.url}/admin/prospects when it's fixed.`]).catch((e) =>
    console.error("outreach alert:", (e as Error).message),
  );
  return reason;
};

/** Creates a lead from a reply and tells Hamza. */
const replyToLead = async (p: { id: string; name: string; email: string }, text: string, subject: string) => {
  const db = rpcClient();
  let leadId: string | null = null;
  if (db) {
    const { data, error } = await db.rpc("app_create_lead", {
      p_secret: serverSecret(),
      p_name: p.name.slice(0, 120),
      p_email: p.email,
      p_project_type: "",
      p_budget: "",
      p_message: (text || `(Reply: ${subject})`).slice(0, 4000),
      p_source: "outreach",
      p_page: "/admin/prospects",
      p_session: null as unknown as string,
    });
    if (error) console.error("outreach lead:", error.message);
    else leadId = data;
  }
  if (leadId) await ox.updateProspect(p.id, { lead_id: leadId });
  await sendOwnerAlert(
    `Outreach reply: ${p.name}`,
    [`${p.name} (${p.email}) replied to your outreach email.`, text || `Subject: ${subject}`, `Lead: ${SITE.url}/admin/leads${leadId ? `?lead=${leadId}` : ""}`, `Prospect: ${SITE.url}/admin/prospects?p=${p.id}`],
    p.email,
  ).catch((e) => console.error("outreach alert:", (e as Error).message));
};

/** Hourly: replies, bounces, unsubscribes and complaints stop the sequence at once. */
export const checkInbox = async (state: State) => {
  const since = new Date(Math.min(Date.now() - DAY, state.settings.started_at ? Date.parse(state.settings.started_at) : Date.now()));
  const { messages, maxUid } = await readInbox(state.settings.last_imap_uid, since);
  const sent = await ox.sentIds();
  const byId = new Map(sent.map((s) => [s.message_id, s]));
  const byEmail = new Map(sent.map((s) => [s.email, s]));
  const summary = { checked: messages.length, replies: 0, bounces: 0, unsubscribes: 0, complaints: 0 };
  for (const m of messages) {
    const match = m.refs.map((r) => byId.get(r)).find(Boolean) ?? (m.failed ? byEmail.get(m.failed) : undefined) ?? byEmail.get(m.from);
    if (!match || m.kind === "other") continue;
    const log = (kind: string, body: string) =>
      ox.addMessage({ prospect_id: match.prospect_id, direction: "in", kind, status: "received", subject: m.subject.slice(0, 200) || "(no subject)", body: body || "(empty)", message_id: null });
    if (m.kind === "bounce") {
      summary.bounces++;
      await log("bounce", `Bounced: ${m.failed ?? match.email}`);
      await ox.stop(match.email, "bounced", match.prospect_id);
    } else if (m.kind === "complaint") {
      summary.complaints++;
      await log("complaint", "Spam complaint (feedback report).");
      await ox.stop(match.email, "complaint", match.prospect_id);
    } else if (m.kind === "unsubscribe") {
      summary.unsubscribes++;
      await log("unsubscribe", "Asked to unsubscribe by email.");
      await ox.stop(match.email, "unsubscribed", match.prospect_id);
    } else if (m.kind === "auto-reply") {
      await log("auto-reply", m.text || "Automatic reply (out of office). The sequence continues.");
    } else {
      summary.replies++;
      await log("reply", m.text);
      await ox.stop(match.email, "replied", match.prospect_id);
      await replyToLead({ id: match.prospect_id, name: match.name, email: match.email }, m.text, m.subject);
    }
  }
  await ox.set({ last_imap_at: new Date().toISOString(), last_imap_uid: maxUid || state.settings.last_imap_uid });
  return summary;
};

/** Sends at most one approved email, if every rule allows it right now. */
export const sendNext = async (state: State, now = new Date()) => {
  if (state.settings.paused) return "paused";
  if (state.settings.next_send_at && Date.parse(state.settings.next_send_at) > now.getTime()) return `waiting until ${state.settings.next_send_at}`;
  const cap = dailyCap(state.settings.started_at, now.getTime());
  if (state.sent_24h >= cap) return `daily cap reached (${state.sent_24h}/${cap})`;
  const queue = await ox.approved(100);
  // US businesses wait until a postal address is in the footer (CAN-SPAM).
  const usAllowed = !!postalAddress();
  const next = queue.find((q) => q.prospect.email && (usAllowed || q.prospect.country !== "US") && inSendingWindow(q.prospect.timezone, now) && (q.message.step === 0 || q.thread?.message_id));
  if (!next) return queue.length ? "no recipient inside 9:00-17:00 Mon-Fri right now" : "nothing approved";
  const p = next.prospect;
  if (await ox.isSuppressed(p.email!, p.id)) {
    await ox.updateMessage(next.message.id, { status: "cancelled", error: "Suppressed or already contacted" });
    return "skipped a suppressed address";
  }
  try {
    const messageId = await sendOutreach({ to: p.email!, subject: next.message.subject, body: next.message.body, unsubscribeToken: p.unsubscribe_token, threadId: next.thread?.message_id });
    const at = now.toISOString();
    await ox.updateMessage(next.message.id, { status: "sent", message_id: messageId, sent_at: at, in_reply_to: next.thread?.message_id ?? null });
    await ox.updateProspect(p.id, { status: "emailed", last_contacted_at: at });
    await ox.set({ next_send_at: new Date(now.getTime() + randomGapMs()).toISOString(), ...(state.settings.started_at ? {} : { started_at: at }) });
    return `sent step ${next.message.step} to ${p.name}`;
  } catch (e) {
    await ox.updateMessage(next.message.id, { status: "failed", error: (e as Error).message.slice(0, 400) });
    await ox.set({ next_send_at: new Date(now.getTime() + randomGapMs()).toISOString() });
    return `failed: ${(e as Error).message}`;
  }
};

/** First-email drafts for audited prospects (approved straight away when approve-first is off). */
export const draftNew = async (state: State, limit: number, onlyProspect?: string) => {
  const list = onlyProspect ? (await ox.toDraft(500)).filter((p) => p.id === onlyProspect) : await ox.toDraft(limit);
  for (const p of list) {
    if (!p.audit) continue;
    const d = await draftFirst(p, p.audit);
    const approved = !state.settings.approve_first;
    await ox.addMessage({ prospect_id: p.id, step: 0, status: approved ? "approved" : "draft", approved_at: approved ? new Date().toISOString() : null, subject: d.subject, body: d.body });
  }
  return list.length;
};

/** Follow-up 1 after 4 days and follow-up 2 after 8 days, in the same thread; then the sequence ends. */
export const draftFollowUps = async (state: State, limit: number) => {
  const due = await ox.followups(limit);
  for (const f of due) {
    const step = f.next_step as 1 | 2;
    const audit = f.audit;
    const link = audit ? reportUrl(audit.report_id) : SITE.url;
    const d = draftFollowUp(f.prospect, step, f.first.subject, link, topProblems(audit?.result ?? null, 1)[0] ?? null);
    const approved = !state.settings.approve_first;
    await ox.addMessage({ prospect_id: f.prospect.id, step, status: approved ? "approved" : "draft", approved_at: approved ? new Date().toISOString() : null, subject: d.subject, body: d.body, in_reply_to: f.first.message_id });
  }
  return due.length;
};

export const PHASES = ["imap", "send", "draft", "audit"] as const;
export type Phase = (typeof PHASES)[number];

/** One scheduler tick. `phases` limits what runs (local tests use it to never send). */
export const tick = async (phases: Phase[] = [...PHASES], budgetMs = 50_000) => {
  const start = Date.now();
  const left = () => budgetMs - (Date.now() - start);
  const report: Record<string, unknown> = {};
  let state = await ox.state();

  if (phases.includes("imap") && (!state.settings.last_imap_at || Date.now() - Date.parse(state.settings.last_imap_at) > 55 * 60_000)) {
    try {
      report.inbox = await checkInbox(state);
    } catch (e) {
      report.inbox = `error: ${(e as Error).message}`;
    }
    state = await ox.state();
  }
  const paused = await safetyCheck(state);
  if (paused) {
    report.paused = paused;
    state = await ox.state();
  }
  if (phases.includes("send")) report.send = await sendNext(state);
  // Discovery continues from the tick (once an hour at most) until today's 150 are found, and
  // covers a daily cron run that failed because the public Overpass servers were busy.
  if (phases.includes("audit") && left() > 45_000 && state.found_24h < MAX_NEW_PER_DAY && !(await ox.cacheGet("discover-tick", 1))) {
    await ox.cachePut("discover-tick", { at: new Date().toISOString() });
    report.discover = await discoverAll(undefined, start + budgetMs - 15_000).catch((e) => `error: ${(e as Error).message}`);
  }
  if (phases.includes("audit")) {
    const done: string[] = [];
    // One outreach audit takes up to ~25 seconds (PageSpeed is capped at 15 s), so it only starts with time left.
    while (left() > 27_000) {
      const [p] = await ox.toAudit(1);
      if (!p) break;
      done.push(`${p.name}: ${await qualify(p as Prospect)}`);
    }
    report.audits = done;
  }
  if (phases.includes("draft") && left() > 12_000) {
    report.drafts = await draftNew(state, left() > 30_000 ? 3 : 1);
    if (left() > 8_000) report.followups = await draftFollowUps(state, 5);
  }
  report.ms = Date.now() - start;
  return report;
};
