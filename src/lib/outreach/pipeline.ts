// The outreach jobs.
// - discoverAll(): daily (Vercel Cron), continued by the tick — saved searches → new prospects,
//   max 150 per day, rotating: the searches that ran longest ago go first.
// - tick(): every few minutes (GitHub Actions) — hourly inbox check, safety checks, at most ONE email
//   per tick, drafts, follow-ups and one audit, inside a time budget.
import { SITE } from "@/lib/site";
import { rpcClient, serverSecret } from "@/lib/supabase/server";
import { sendOwnerAlert } from "@/lib/leads/email";
import { ox, type Prospect, type State } from "./db";
import { discover, setOsmDeadline } from "./osm";
import { qualify } from "./qualify";
import { draftCheckBack, draftDay3, draftDay7, draftEmail1, draftHotReply, prospectFindings, reportUrl, subjectFor } from "./compose";
import { classifyReply, type ReplyClass } from "./classify";
import { postalAddress, waitingForAddress, withAddress } from "./address";
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

/** Random gap between two emails: 4 to 11 minutes. */
const randomGapMs = () => (4 + Math.random() * 7) * 60_000;

/** Searches in rotation order: never run first, then the one that ran longest ago. */
const rotation = (state: State) =>
  state.searches
    .filter((s) => !waitingForAddress(s.country))
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
  // Every OpenStreetMap request in this run stops at the deadline, so a busy server can't outlast the function.
  setOsmDeadline(deadline);
  try {
    for (const s of searches) {
      if (budget <= 0 || deadline - Date.now() < 15_000) break;
      try {
        const added = await discover(s, Math.min(budget, PER_SEARCH));
        budget -= added;
        results.push({ search: `${s.business_type}, ${s.city}`, added });
      } catch (e) {
        results.push({ search: `${s.business_type}, ${s.city}`, added: 0, error: (e as Error).message });
      }
    }
  } finally {
    setOsmDeadline(Number.POSITIVE_INFINITY);
  }
  return results;
};
/**
 * Auto-pause: more than 3% bounces in the last 50 emails, or any spam complaint (both counted since
 * outreach was last resumed). Emails Hamza why.
 */
const safetyCheck = async (state: State) => {
  if (state.settings.paused) return state.settings.pause_reason ?? "paused";
  const rate = state.last50_sent ? state.last50_bounces / state.last50_sent : 0;
  let reason: string | null = null;
  if (state.complaints_7d > 0) reason = `Spam complaint received (${state.complaints_7d}).`;
  else if (state.last50_bounces > 0 && rate > 0.03) reason = `Bounce rate ${(rate * 100).toFixed(1)}% over the last ${state.last50_sent} emails (${state.last50_bounces} bounced).`;
  if (!reason) return null;
  await ox.set({ paused: true, pause_reason: `Auto-paused: ${reason}` });
  await sendOwnerAlert("Outreach auto-paused", [`Outreach was paused automatically. ${reason}`, `Check the list and resume in ${SITE.url}/admin/prospects when it's fixed.`]).catch((e) =>
    console.error("outreach alert:", (e as Error).message),
  );
  return reason;
};

/** Creates a lead from a hot reply, drafts Hamza's answer (approve-first) and emails him the thread. */
const handleHotReply = async (p: Prospect, cls: ReplyClass, text: string, subject: string) => {
  const db = rpcClient();
  let leadId: string | null = null;
  if (db) {
    const { data, error } = await db.rpc("app_create_lead", {
      p_secret: serverSecret(),
      p_name: p.name.slice(0, 120),
      p_email: p.email!,
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
  const thread = await ox.thread(p.id);
  const first = thread.find((m) => m.direction === "out" && m.step === 0);
  const audit = await ox.latestAudit(p.id);
  const d = draftHotReply(p, first?.subject ?? subject, audit?.report_id && audit.result ? reportUrl(audit.report_id) : null);
  await ox.addMessage({ prospect_id: p.id, step: 3, status: "draft", subject: d.subject, body: withAddress(p.country, d.body), in_reply_to: first?.message_id ?? null });
  const transcript = thread.map((m) => `--- ${m.direction === "out" ? "You" : p.name} (${m.kind}, ${m.sent_at ?? m.created_at})\n${m.body}`).join("\n\n");
  await sendOwnerAlert(
    `Hot reply (${cls === "question" ? "question" : "interested"}): ${p.name}`,
    [
      `${p.name} (${p.email}) replied to your outreach email. A reply draft with the report link and your WhatsApp is waiting for approval.`,
      `Approve it: ${SITE.url}/admin/prospects?tab=hot`,
      `Lead: ${SITE.url}/admin/leads${leadId ? `?lead=${leadId}` : ""}`,
      `Thread:\n\n${transcript}`,
    ],
    p.email!,
  ).catch((e) => console.error("outreach alert:", (e as Error).message));
};

/**
 * Inbox check (every tick): bounces, complaints and unsubscribe requests stop and suppress at once;
 * replies are classified: interested/question → hot (lead + reply draft + email to Hamza),
 * no → suppressed forever, not now → one check-back in 60 days, out of office → sequence +7 days.
 */
export const checkInbox = async (state: State) => {
  const since = new Date(Math.min(Date.now() - DAY, state.settings.started_at ? Date.parse(state.settings.started_at) : Date.now()));
  const { messages, maxUid } = await readInbox(state.settings.last_imap_uid, since);
  const sent = await ox.sentIds();
  const byId = new Map(sent.map((s) => [s.message_id, s]));
  const byEmail = new Map(sent.map((s) => [s.email, s]));
  const summary: Record<string, number> = { checked: messages.length };
  const count = (k: string) => (summary[k] = (summary[k] ?? 0) + 1);
  for (const m of messages) {
    const match = m.refs.map((r) => byId.get(r)).find(Boolean) ?? (m.failed ? byEmail.get(m.failed) : undefined) ?? byEmail.get(m.from);
    if (!match || m.kind === "other") continue;
    const log = (kind: string, body: string) =>
      ox.addMessage({ prospect_id: match.prospect_id, direction: "in", kind, status: "received", subject: m.subject.slice(0, 200) || "(no subject)", body: body || "(empty)", message_id: null });
    if (m.kind === "bounce") {
      count("bounces");
      await log("bounce", `Bounced: ${m.failed ?? match.email}`);
      await ox.stop(match.email, "bounced", match.prospect_id);
      await ox.updateProspect(match.prospect_id, { reply_class: "bounce" });
      continue;
    }
    if (m.kind === "complaint") {
      count("complaints");
      await log("complaint", "Spam complaint (feedback report).");
      await ox.stop(match.email, "complaint", match.prospect_id);
      continue;
    }
    if (m.kind === "unsubscribe") {
      count("no");
      await log("unsubscribe", "Asked to unsubscribe by email.");
      await ox.stop(match.email, "unsubscribed", match.prospect_id);
      await ox.updateProspect(match.prospect_id, { reply_class: "no" });
      continue;
    }
    const cls: ReplyClass = m.kind === "auto-reply" ? "out_of_office" : await classifyReply(m.text, m.subject);
    count(cls);
    if (cls === "out_of_office") {
      await log("auto-reply", m.text || "Automatic reply (out of office).");
      await ox.updateProspect(match.prospect_id, { reply_class: "out_of_office", snooze_until: new Date(Date.now() + 7 * DAY).toISOString() });
      continue;
    }
    await log("reply", m.text);
    if (cls === "no") {
      await ox.stop(match.email, "unsubscribed", match.prospect_id);
      await ox.updateProspect(match.prospect_id, { reply_class: "no" });
    } else if (cls === "not_now") {
      await ox.stop(match.email, "replied", match.prospect_id);
      await ox.updateProspect(match.prospect_id, { reply_class: "not_now", next_followup_at: new Date(Date.now() + 60 * DAY).toISOString() });
    } else if (cls === "bounce") {
      await ox.stop(match.email, "bounced", match.prospect_id);
      await ox.updateProspect(match.prospect_id, { reply_class: "bounce" });
    } else {
      await ox.stop(match.email, "replied", match.prospect_id);
      await ox.updateProspect(match.prospect_id, { reply_class: cls });
      const p = await ox.prospect(match.prospect_id);
      if (p) await handleHotReply(p, cls, m.text, m.subject);
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
  // US businesses wait until a postal address is set (CAN-SPAM).
  // US and Canada wait until a postal address is set (CAN-SPAM / CASL).
  const next = queue.find(
    (q) => q.prospect.email && !waitingForAddress(q.prospect.country) && inSendingWindow(q.prospect.timezone, now) && (q.message.step === 0 || q.thread?.message_id),
  );
  if (!next) return queue.length ? "no recipient inside 9:00-17:00 Mon-Fri right now" : "nothing approved";
  const p = next.prospect;
  // Suppression list before every send; never two businesses at the same email domain.
  const blocked =
    (await ox.isSuppressed(p.email!, p.id)) ? "Suppressed or already contacted" : next.message.step === 0 && (await ox.domainEmailed(p.email!, p.id)) ? "Someone at this email domain was already emailed" : null;
  if (blocked) {
    await ox.updateMessage(next.message.id, { status: "cancelled", error: blocked });
    return `skipped: ${blocked}`;
  }
  try {
    const messageId = await sendOutreach({ to: p.email!, subject: next.message.subject, body: withAddress(p.country, next.message.body), threadId: next.message.step === 0 ? null : next.thread?.message_id });
    const at = now.toISOString();
    await ox.updateMessage(next.message.id, { status: "sent", message_id: messageId, sent_at: at, in_reply_to: next.message.step === 0 ? null : (next.thread?.message_id ?? null) });
    if ((next.message.step ?? 0) <= 2) await ox.updateProspect(p.id, { status: "emailed", last_contacted_at: at });
    else await ox.updateProspect(p.id, { last_contacted_at: at });
    await ox.set({ next_send_at: new Date(now.getTime() + randomGapMs()).toISOString(), ...(state.settings.started_at ? {} : { started_at: at }) });
    return `sent step ${next.message.step} to ${p.name}`;
  } catch (e) {
    await ox.updateMessage(next.message.id, { status: "failed", error: (e as Error).message.slice(0, 400) });
    await ox.set({ next_send_at: new Date(now.getTime() + randomGapMs()).toISOString() });
    return `failed: ${(e as Error).message}`;
  }
};

const status = (state: State) => (state.settings.approve_first ? { status: "draft", approved_at: null } : { status: "approved", approved_at: new Date().toISOString() });

/** Email 1 drafts for audited prospects, highest lead score first (approve-first keeps them as drafts). */
export const draftNew = async (state: State, limit: number, onlyProspect?: string) => {
  const list = onlyProspect ? (await ox.toDraft(500)).filter((p) => p.id === onlyProspect) : await ox.toDraft(limit);
  let made = 0;
  for (const p of list) {
    if (!p.audit) continue;
    try {
      const d = await draftEmail1(p, p.audit);
      await ox.addMessage({ prospect_id: p.id, step: 0, ...status(state), subject: d.subject, body: withAddress(p.country, d.body), variant: d.variant });
      made++;
    } catch (e) {
      await ox.updateProspect(p.id, { status: "skipped", skip_reason: (e as Error).message.slice(0, 200) });
    }
  }
  return made;
};

/** Day 3 and day 7 in the same thread; then the sequence ends. */
export const draftFollowUps = async (state: State, limit: number) => {
  const due = await ox.followups(limit);
  for (const f of due) {
    const step = f.next_step as 1 | 2;
    const d =
      step === 1
        ? draftDay3(f.prospect, f.first.subject, f.audit ? reportUrl(f.audit.report_id) : SITE.url, prospectFindings(f.prospect, f.audit?.result ?? null))
        : draftDay7(f.prospect, f.first.subject);
    await ox.addMessage({ prospect_id: f.prospect.id, step, ...status(state), subject: d.subject, body: withAddress(f.prospect.country, d.body), in_reply_to: f.first.message_id });
  }
  return due.length;
};

/** "Not now" replies: one check-back 60 days later. */
export const draftCheckBacks = async (state: State, limit: number) => {
  const due = await ox.checkbacks(limit);
  for (const c of due) {
    const audit = await ox.latestAudit(c.prospect.id);
    const d = draftCheckBack(c.prospect, c.first?.subject ?? subjectFor(c.prospect, "A"), prospectFindings(c.prospect, audit?.result ?? null));
    await ox.addMessage({ prospect_id: c.prospect.id, step: 4, ...status(state), subject: d.subject, body: withAddress(c.prospect.country, d.body), in_reply_to: c.first?.message_id ?? null });
  }
  return due.length;
};

export const PHASES = ["imap", "send", "draft", "audit"] as const;
export type Phase = (typeof PHASES)[number];

/** One scheduler tick. `phases` limits what runs (local tests leave out "send"). */
export const tick = async (phases: Phase[] = [...PHASES], budgetMs = 50_000) => {
  const start = Date.now();
  const left = () => budgetMs - (Date.now() - start);
  const report: Record<string, unknown> = {};
  // "Last tick" in /admin/prospects shows the scheduler is running.
  await ox.set({ last_tick_at: new Date().toISOString() });
  // Address now set: US/Canadian prospects that were waiting go back through qualification.
  if (postalAddress()) report.released = await ox.releaseWaiting();
  let state = await ox.state();

  // Replies, bounces and "no"s are handled before anything is sent.
  if (phases.includes("imap")) {
    try {
      report.inbox = await Promise.race([checkInbox(state), new Promise<string>((r) => setTimeout(() => r("inbox check took over 20 s; it continues next tick"), 20_000))]);
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
    // One outreach audit can take ~34 seconds (page, PageSpeed capped at 15 s, contact page, MX), so it only starts with time left.
    while (left() > 36_000) {
      const [p] = await ox.toAudit(1);
      if (!p) break;
      done.push(`${p.name}: ${await qualify(p as Prospect)}`);
    }
    report.audits = done;
  }
  // Templates are instant; a Gemini draft can take up to 2 x 25 s, so one per tick with time left.
  if (phases.includes("draft") && left() > 12_000) {
    if (left() > 30_000) report.drafts = await draftNew(state, 1);
    if (left() > 8_000) report.followups = await draftFollowUps(state, 5);
    if (left() > 5_000) report.checkbacks = await draftCheckBacks(state, 5);
  }
  report.ms = Date.now() - start;
  return report;
};