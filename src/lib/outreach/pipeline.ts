// The outreach jobs (autopilot, owner 2026-11-16). One tick every 5 minutes (Supabase pg_cron):
// - inbox: bounces, complaints and "no" suppress at once; "yes" and price questions get an automatic
//   reply in the same thread; anything else is a HOT alert to Hamza, with no reply.
// - auto-pause (2 bounces in a day until 20 emails are sent, then over 3% of the last 50; or any
//   spam complaint) and the on/off switch.
// - send: replies first; then at most one email per tick, Mon-Fri 9:00-17:00 in the recipient's
//   time zone, 4-11 minute gaps, the daily limit, and a fair share across niches and countries.
// - scanning is its own job (discoverTick, pg_cron every 10 minutes): 150+ new businesses a day,
//   area after area, every day of the week (src/lib/outreach/coverage.ts).
// - audits (3 side by side), then drafts. Every email-1 draft goes through the automatic checks (checks.ts): sent,
//   "Needs a look" (expires after 7 days), or rejected.
// - the daily summary email at 9:00 PKT.
import { SITE } from "@/lib/site";
import { rpcClient, serverSecret } from "@/lib/supabase/server";
import { sendOwnerAlert } from "@/lib/leads/email";
import { ox, type Funnel, type Prospect, type State } from "./db";
import { qualify } from "./qualify";
import { biz, checkEmail1, emailCity, isContentLead, offerFor, personalLine, draftCheckBack, draftDay3, draftDay7, draftEmail1, prospectFindings, replyInterested, replyPrice, reportUrl, subjectFor } from "./compose";
import { classifyReply, type ReplyClass } from "./classify";
import { postalAddress, waitingForAddress, withAddress } from "./address";
import { bounceType, readInbox, sendOutreach } from "./mail";
import { autoCheck, hardChecks } from "./checks";
import { DAILY_NEW_TARGET, discoverRun, doneSet, MAX_NEW_PER_DAY, progress, scanArea } from "./coverage";
import { cellLabel } from "./areas";
import { takesBookings } from "./osm-types";
import { researchProspect } from "./research";
import { aiBudget } from "./ai";
import { blogTopics } from "./topics";
import { dailyLog } from "./map";

export { DAILY_NEW_TARGET, MAX_NEW_PER_DAY };
const DAY = 86_400_000;

/**
 * One free Gmail account: 15/day in week 1, 20 in week 2, 30 in week 3, then 40 only while the
 * bounce rate stays under 2% (last 50 emails) with no spam complaint; otherwise 30.
 */
export const dailyCap = (startedAt: string | null, health?: { last50_sent: number; last50_bounces: number; complaints_7d: number; settings?: { cap_cut?: number } }, now = Date.now()) => {
  // Lowered by 5 each time 2 spam/policy blocks happen within 7 days (owner, 2026-11-17); never below 5.
  const cut = health?.settings?.cap_cut ?? 0;
  const base = (() => {
    if (!startedAt) return 15;
    const days = (now - Date.parse(startedAt)) / DAY;
    if (days < 7) return 15;
    if (days < 14) return 20;
    if (days < 21) return 30;
    const healthy = !!health && health.complaints_7d === 0 && (health.last50_sent ? health.last50_bounces / health.last50_sent : 0) < 0.02;
    return healthy ? 40 : 30;
  })();
  return Math.max(5, base - cut);
};

/** Ready drafts to keep in the buffer: two days of the daily limit (owner, 2026-11-17). */
export const bufferTarget = (cap: number) => cap * 2;

/** Never two cold emails less than 4 minutes apart (owner, 2026-11-17). */
export const MIN_GAP_MS = 4 * 60_000;

/** Monday–Friday, 9:00–17:00 in the recipient's time zone. */
export const inSendingWindow = (timezone: string, now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "numeric", hour12: false }).formatToParts(now);
  const day = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  return !["Sat", "Sun"].includes(day) && hour >= 9 && hour < 17;
};

/** Random gap between two emails: 4 to 11 minutes. */
const randomGapMs = () => (4 + Math.random() * 7) * 60_000;

/** Below this many emails (since the last resume) a percentage means little: one bounce in 7 is 14%. */
export const MIN_SENT_FOR_RATE = 20;

/**
 * Why outreach should pause, or null (owner, 2026-11-17). Any spam complaint pauses. Until 20 emails
 * have been sent since the last resume, only 2+ bounces within 24 hours pause; from 20 on, a bounce
 * rate over 3% of the last 50 emails does.
 */
export const pauseReason = (s: Pick<State, "complaints_7d" | "last50_sent" | "last50_bounces" | "bounces_24h">) => {
  if (s.complaints_7d > 0) return `Spam complaint received (${s.complaints_7d}).`;
  if (s.last50_sent < MIN_SENT_FOR_RATE) return (s.bounces_24h ?? 0) >= 2 ? `${s.bounces_24h} bounces in the last 24 hours (fewer than ${MIN_SENT_FOR_RATE} emails sent so far).` : null;
  const rate = s.last50_bounces / s.last50_sent;
  return rate > 0.03 ? `Bounce rate ${(rate * 100).toFixed(1)}% over the last ${s.last50_sent} emails (${s.last50_bounces} bounced).` : null;
};

/** 2 spam/policy blocks within 7 days (since the last cut): lower the daily limit by 5 and email Hamza. */
const spamBlockCheck = async (state: State) => {
  if ((state.spam_blocks_since_cut ?? 0) < 2) return null;
  const cut = (state.settings.cap_cut ?? 0) + 5;
  await ox.set({ cap_cut: cut, cap_cut_at: new Date().toISOString() });
  const cap = dailyCap(state.settings.started_at, { ...state, settings: { ...state.settings, cap_cut: cut } });
  await sendOwnerAlert("Outreach: daily limit lowered after spam blocks", [
    `${state.spam_blocks_since_cut} emails were refused as spam/policy blocks (550 5.7.x) in the last 7 days, so the daily limit is now ${cap} (lowered by ${cut} in total).`,
    "These addresses exist; the receiving servers refused the email. Check the Suppressed tab for the exact reasons, and whether the sending Gmail is healthy.",
    `${SITE.url}/admin/prospects?tab=suppressed`,
  ]).catch((e) => console.error("outreach alert:", (e as Error).message));
  return `limit lowered by 5 (now ${cap})`;
};

/** Auto-pause on pauseReason (counted since the last resume). */
const safetyCheck = async (state: State) => {
  if (state.settings.paused) return state.settings.pause_reason ?? "paused";
  const reason = pauseReason(state);
  if (!reason) return null;
  await ox.set({ paused: true, pause_reason: `Auto-paused: ${reason}` });
  await sendOwnerAlert("Outreach auto-paused", [`Outreach was paused automatically. ${reason}`, `Check the list and resume in ${SITE.url}/admin/prospects when it's fixed.`]).catch((e) =>
    console.error("outreach alert:", (e as Error).message),
  );
  return reason;
};

const createLead = async (p: Prospect, text: string, subject: string) => {
  const db = rpcClient();
  if (!db) return null;
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
  return error ? null : data;
};

/**
 * A positive reply: always a lead. "yes" → the fixes + report/preview link + WhatsApp, sent
 * automatically in the same thread. Price → real starting prices + WhatsApp. Anything else → no
 * reply; Hamza gets a HOT email with the thread right away.
 */
const handleReply = async (p: Prospect, cls: ReplyClass, text: string, subject: string) => {
  const leadId = await createLead(p, text, subject);
  if (leadId) await ox.updateProspect(p.id, { lead_id: leadId });
  const thread = await ox.thread(p.id);
  const first = thread.find((m) => m.direction === "out" && m.step === 0);
  const firstSubject = first?.subject ?? subject;
  // Content offer + "yes": 3 topics from real Google searches. Fewer than 3 found → Hamza answers (HOT).
  const contentYes = cls === "interested" && isContentLead(p);
  const topics = contentYes ? await blogTopics(p).catch(() => null) : null;
  if ((cls === "interested" && !contentYes) || cls === "price" || (contentYes && topics)) {
    const audit = await ox.latestAudit(p.id);
    const d =
      cls === "price"
        ? replyPrice(p, firstSubject)
        : replyInterested(p, firstSubject, prospectFindings(p, audit?.result ?? null), audit?.report_id && audit.result ? reportUrl(audit.report_id) : null, topics);
    await ox.addMessage({
      prospect_id: p.id,
      step: 3,
      status: "approved",
      approved_at: new Date().toISOString(),
      subject: d.subject,
      body: withAddress(p.country, d.body),
      in_reply_to: first?.message_id ?? null,
    });
    // No website + "yes": Hamza promised a sample homepage within 2 days, so this lead is HOT.
    if (cls === "interested" && prospectFindings(p, audit?.result ?? null)[0]?.id === "no-website") {
      await ox.updateProspect(p.id, { reply_class: "question" });
      await sendOwnerAlert(
        `HOT: ${p.name} wants a free sample homepage (promised within 2 days)`,
        [
          `${p.name} (${p.email}${p.phone ? `, ${p.phone}` : ""}) said yes to a free sample homepage. They got an automatic reply: "Great, I'll make it and send it to you within 2 days."`,
          `Their reply: "${text.replace(/\s+/g, " ").slice(0, 400)}"`,
          p.research?.note ? `Research note: ${p.research.note}` : "",
          `Lead: ${SITE.url}/admin/leads${leadId ? `?lead=${leadId}` : ""} · Prospect: ${SITE.url}/admin/prospects?p=${p.id}`,
        ].filter(Boolean),
        p.email!,
      ).catch((e) => console.error("outreach alert:", (e as Error).message));
    }
    return;
  }
  if (contentYes) await ox.updateProspect(p.id, { reply_class: "question" }); // no 3 real topics found: Hamza answers
  const transcript = [...thread.map((m) => `--- ${m.direction === "out" ? "You" : p.name} (${m.kind}, ${m.sent_at ?? m.created_at})\n${m.body}`), `--- ${p.name} (reply, now)\n${text}`].join("\n\n");
  await sendOwnerAlert(
    `HOT: ${p.name} replied and needs you`,
    [
      `${p.name} (${p.email}${p.phone ? `, ${p.phone}` : ""}) replied to your outreach email with something only you can answer. Nothing was sent automatically.`,
      `Reply from your outreach Gmail (same thread), or message them on WhatsApp.`,
      `Lead: ${SITE.url}/admin/leads${leadId ? `?lead=${leadId}` : ""}`,
      `Thread:\n\n${transcript}`,
    ],
    p.email!,
  ).catch((e) => console.error("outreach alert:", (e as Error).message));
};

/** Inbox check: bounces, complaints and "no" stop and suppress at once; replies are classified. */
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
    const log = (kind: string, body: string, extra: Record<string, unknown> = {}) =>
      ox.addMessage({ prospect_id: match.prospect_id, direction: "in", kind, status: "received", subject: m.subject.slice(0, 200) || "(no subject)", body: body || "(empty)", message_id: null, ...extra });
    if (m.kind === "bounce") {
      const type = bounceType(m.reason);
      count(type === "spam" ? "spam_blocks" : "bounces");
      await log("bounce", `Bounced: ${m.failed ?? match.email}${m.reason ? `\nReason: ${m.reason}` : ""}`, { bounce_type: type });
      await ox.stop(match.email, "bounced", match.prospect_id, m.reason);
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
      if (p) await handleReply(p, cls, m.text, m.subject);
    }
  }
  await ox.set({ last_imap_at: new Date().toISOString(), last_imap_uid: maxUid || state.settings.last_imap_uid });
  return summary;
};

type QueueItem = Awaited<ReturnType<typeof ox.approved>>[number];

const deliver = async (next: QueueItem, now: Date) => {
  const p = next.prospect;
  const step = next.message.step ?? 0;
  const messageId = await sendOutreach({ to: p.email!, subject: next.message.subject, body: withAddress(p.country, next.message.body), threadId: step === 0 ? null : next.thread?.message_id });
  const at = now.toISOString();
  await ox.updateMessage(next.message.id, { status: "sent", message_id: messageId, sent_at: at, in_reply_to: step === 0 ? null : (next.thread?.message_id ?? null) });
  if (step <= 2) await ox.updateProspect(p.id, { status: "emailed", last_contacted_at: at });
  else await ox.updateProspect(p.id, { last_contacted_at: at });
  return `sent step ${step} to ${p.name}`;
};

/**
 * Replies to people who wrote back go out at once (any hour, outside the gap and the daily limit).
 * Then at most one sequence email, if every rule allows it right now.
 */
export const sendNext = async (state: State, now = new Date()) => {
  if (state.settings.paused) return "paused";
  const queue = await ox.approved(300);
  const out: string[] = [];
  for (const r of queue.filter((q) => (q.message.step ?? 0) >= 3 && q.prospect.email && q.thread?.message_id).slice(0, 3)) {
    try {
      out.push(await deliver(r, now));
    } catch (e) {
      await ox.updateMessage(r.message.id, { status: "failed", error: (e as Error).message.slice(0, 400) });
      out.push(`reply failed: ${(e as Error).message}`);
    }
  }
  if (state.settings.next_send_at && Date.parse(state.settings.next_send_at) > now.getTime()) return [...out, `waiting until ${state.settings.next_send_at}`].join("; ");
  // Also from the database, so a failed save of next_send_at or two overlapping ticks can't send closer than 4 minutes.
  if (state.last_cold_sent_at && now.getTime() - Date.parse(state.last_cold_sent_at) < MIN_GAP_MS) return [...out, "less than 4 minutes since the last email"].join("; ");
  const cap = dailyCap(state.settings.started_at, state, now.getTime());
  if (state.sent_24h >= cap) return [...out, `daily limit reached (${state.sent_24h}/${cap})`].join("; ");
  // The queue is ordered by fewest sends in the last 24 h per niche, then per country (fair share).
  const next = queue.find(
    (q) => (q.message.step ?? 0) <= 2 && q.prospect.email && !waitingForAddress(q.prospect.country) && inSendingWindow(q.prospect.timezone, now) && (q.message.step === 0 || q.thread?.message_id),
  );
  if (!next) return [...out, queue.length ? "no recipient inside 9:00-17:00 Mon-Fri right now" : "nothing queued"].join("; ");
  const p = next.prospect;
  // Hard rules again, right before sending: chain/brand, MX, suppression, address; one company domain once.
  const blocked = (await hardChecks(p)) ?? (next.message.step === 0 && (await ox.domainEmailed(p.email!, p.id)) ? "Someone at this email domain was already emailed" : null);
  if (blocked) {
    await ox.updateMessage(next.message.id, { status: "cancelled", error: blocked });
    if (next.message.step === 0) await ox.updateProspect(p.id, { status: "skipped", skip_reason: blocked });
    return [...out, `skipped: ${blocked}`].join("; ");
  }
  try {
    out.push(await deliver(next, now));
    await ox.set({ next_send_at: new Date(now.getTime() + randomGapMs()).toISOString(), ...(state.settings.started_at ? {} : { started_at: now.toISOString() }) });
  } catch (e) {
    await ox.updateMessage(next.message.id, { status: "failed", error: (e as Error).message.slice(0, 400) });
    await ox.set({ next_send_at: new Date(now.getTime() + randomGapMs()).toISOString() });
    out.push(`failed: ${(e as Error).message}`);
  }
  return out.join("; ");
};

const approved = () => ({ status: "approved", approved_at: new Date().toISOString() });

const RESEARCH_MAX_AGE = 14 * DAY;

/**
 * Active check + research for one audited prospect (owner, 2026-11-17). Returns the prospect with
 * its research, or null when it was skipped as inactive. Research younger than 14 days is reused.
 */
export const researchFor = async <P extends Prospect & { audit: { result: unknown } | null }>(p: P, deadline = Number.POSITIVE_INFINITY): Promise<P | null> => {
  if (p.research && !p.research.pending && !p.research.wait && p.researched_at && Date.now() - Date.parse(p.researched_at) < RESEARCH_MAX_AGE) return p.research.active ? p : null;
  const r = await researchProspect(p, (p.audit?.result ?? null) as Parameters<typeof researchProspect>[1], deadline, (p.research?.pending ?? 0) + 1);
  const at = new Date().toISOString();
  if (!r.active) {
    await ox.updateProspect(p.id, { research: r, researched_at: at, status: "skipped", skip_reason: `Inactive: ${r.inactiveReason ?? "no sign of life"}`.slice(0, 200) });
    return null;
  }
  await ox.updateProspect(p.id, { research: r, researched_at: at, ...(r.quality ? { lead_score: r.quality.total } : {}) });
  return { ...p, research: r, researched_at: at, lead_score: r.quality?.total ?? p.lead_score };
};

/**
 * Email 1 for audited prospects, best leads first, each one researched first (active check, research
 * note, personal line). Each draft goes through the automatic checks: ok → queued, uncertain →
 * "Needs a look", broken rule → the business is skipped.
 * `onlyProspect` redrafts one business; `forReview` keeps the new draft in "Needs a look".
 */
export const draftNew = async (_state: State, limit: number, onlyProspect?: string, forReview?: string, deadline = Number.POSITIVE_INFINITY) => {
  // A few extra rows, so businesses waiting for a research retry never block the ones behind them.
  const list = onlyProspect ? (await ox.toDraft(500)).filter((x) => x.id === onlyProspect) : await ox.toDraft(limit * 6);
  let made = 0;
  let worked = 0;
  const ai = await aiBudget().catch(() => ({ blocked: null as "budget" | "backoff" | null }));
  for (const listed of list) {
    // Research takes up to ~40 s and a Gemini draft up to ~25 s: stop before the function's time runs out.
    if (worked >= limit || deadline - Date.now() < 30_000) break;
    if (!listed.audit) continue; // no audit row yet: never treated as "no website"
    // Sites need the outreach Gemini budget for research: none left today or a back-off running → wait.
    const fresh = listed.research && !listed.research.pending && !listed.research.wait;
    if (listed.website && !fresh && ai.blocked) continue;
    // The AI writer was busy last time: wait 30 minutes between research attempts.
    if (listed.research?.pending && listed.researched_at && Date.now() - Date.parse(listed.researched_at) < 30 * 60_000) continue;
    worked++;
    let p: typeof listed | null;
    try {
      p = await researchFor(listed, deadline);
    } catch (e) {
      await ox.updateProspect(listed.id, { status: "skipped", skip_reason: `Research failed: ${(e as Error).message}`.slice(0, 200) });
      continue;
    }
    if (!p) continue;
    if (p.research?.pending || p.research?.wait) continue; // the AI writer was busy: researched again on a later tick before drafting
    if (deadline - Date.now() < 22_000) break; // researched; drafted next tick (the research is reused)
    try {
      const d = await draftEmail1(p, p.audit);
      const facts = [biz(p), emailCity(p) ?? "", personalLine(p), ...d.findings.map((x) => x.cost), String(Math.min(3, d.findings.length))].join("\n");
      await ox.updateProspect(p.id, { offer: offerFor(p) });
      const verdict = await autoCheck(p, p.audit?.result ?? null, d.findings, d.body, checkEmail1(d.body, d.subject, facts, takesBookings(p.business_type)));
      if (verdict.kind === "reject") {
        await ox.updateProspect(p.id, { status: "skipped", skip_reason: verdict.reason.slice(0, 200) });
        continue;
      }
      const review = verdict.kind === "review" ? verdict.reason : forReview;
      await ox.addMessage({
        prospect_id: p.id,
        step: 0,
        ...(review ? { status: "review", review_reason: review } : approved()),
        subject: d.subject,
        body: withAddress(p.country, d.body),
        variant: d.variant,
      });
      made++;
    } catch (e) {
      await ox.updateProspect(p.id, { status: "skipped", skip_reason: (e as Error).message.slice(0, 200) });
    }
  }
  return made;
};

/** Day 3 and day 7 in the same thread (templates, queued automatically); then the sequence ends. */
export const draftFollowUps = async (limit: number) => {
  const due = await ox.followups(limit);
  for (const f of due) {
    const step = f.next_step as 1 | 2;
    const d =
      step === 1
        ? draftDay3(f.prospect, f.first.subject, f.audit?.report_id && f.audit.result ? reportUrl(f.audit.report_id) : SITE.url, prospectFindings(f.prospect, f.audit?.result ?? null))
        : draftDay7(f.prospect, f.first.subject);
    await ox.addMessage({ prospect_id: f.prospect.id, step, ...approved(), subject: d.subject, body: withAddress(f.prospect.country, d.body), in_reply_to: f.first.message_id });
  }
  return due.length;
};

/** "Not now" replies: one check-back 60 days later. */
export const draftCheckBacks = async (limit: number) => {
  const due = await ox.checkbacks(limit);
  for (const c of due) {
    const audit = await ox.latestAudit(c.prospect.id);
    const d = draftCheckBack(c.prospect, c.first?.subject ?? subjectFor(c.prospect, "A"), prospectFindings(c.prospect, audit?.result ?? null));
    await ox.addMessage({ prospect_id: c.prospect.id, step: 4, ...approved(), subject: d.subject, body: withAddress(c.prospect.country, d.body), in_reply_to: c.first?.message_id ?? null });
  }
  return due.length;
};

// ---------- Daily summary, 9:00 PKT ----------

const PKT_OFFSET = 5 * 3_600_000; // Pakistan has no daylight saving
const pktDate = (t: number) => new Date(t + PKT_OFFSET).toISOString().slice(0, 10);
const pktDayStart = (t: number) => Date.parse(`${pktDate(t)}T00:00:00Z`) - PKT_OFFSET;
const pct = (d: number, t: number) => (t ? `${Math.round((d / t) * 1000) / 10}%` : "0%");

/** The funnel as plain lines (shortfall email, summary). */
export const funnelLines = (f: Funnel) => [
  `Found ${f.found} businesses → ${f.checked} checked → ${f.with_email} with an email → ${f.active} passed the active check (of ${f.active_checked}) → ${f.researched} researched → ${f.drafted} drafted → ${f.sent} sent.`,
  f.held.length ? `Held or skipped:\n${f.held.slice(0, 12).map((h) => `- ${h.n} × ${h.reason}`).join("\n")}` : "Held or skipped: none.",
];

export const sendDailySummary = async (now = Date.now()) => {
  const todayStart = pktDayStart(now);
  const from = new Date(todayStart - DAY);
  const [s, rows, funnel, map] = await Promise.all([
    ox.dailySummary(from.toISOString(), new Date(todayStart).toISOString()),
    ox.coverage(),
    ox.funnel(from.toISOString()),
    ox.map().catch(() => null),
  ]);
  const cov = progress(rows);
  const classes = Object.entries(s.by_class)
    .map(([k, v]) => `${k.replace("_", " ")} ${v}`)
    .join(", ");
  const lines = [
    `Yesterday (${pktDate(from.getTime())}, Pakistan time):`,
    ...(map ? dailyLog(map, from.getTime(), todayStart, "Area") : []),
    `Emails sent: ${s.sent_first} first emails, ${s.sent_followups} follow-ups, ${s.sent_replies} automatic replies.`,
    `Replies: ${s.replies}${classes ? ` (${classes})` : ""}. Bounces: ${s.bounces}.`,
    s.hot.length
      ? `HOT leads you need to call or answer (${s.hot.length}):\n${s.hot
          .map((h) => `- ${h.name} (${h.type}, ${[h.city, h.country].filter(Boolean).join(", ")}): ${[h.phone, h.email].filter(Boolean).join(" · ")}${h.reply ? `\n  "${h.reply.replace(/\s+/g, " ").slice(0, 200)}"` : ""}`)
          .join("\n")}`
      : "HOT leads: none waiting for you.",
    s.auto_answered.length ? `Answered automatically (fixes or prices sent):\n${s.auto_answered.map((a) => `- ${a.name} (${a.class}): ${[a.phone, a.email].filter(Boolean).join(" · ")}`).join("\n")}` : "",
    `Funnel yesterday:\n${funnelLines(funnel).join("\n")}`,
    `New qualified leads: ${s.qualified}. Queued to send: ${s.queued}. Needs a look: ${s.needs_look}.`,
    `Coverage:\n${cov.countries.map((c) => `- ${c.label}: ${pct(c.done, c.total)}${c.open ? "" : " (locked until a postal address is set)"}`).join("\n")}`,
    s.paused ? `PAUSED: ${s.pause_reason ?? "paused"}. Resume in ${SITE.url}/admin/prospects once it's fixed.` : "Auto-pause: not triggered.",
    `${SITE.url}/admin/prospects?tab=map`,
  ].filter(Boolean);
  await sendOwnerAlert(`Outreach daily summary: ${s.sent_first + s.sent_followups} sent, ${s.replies} replies${s.hot.length ? `, ${s.hot.length} HOT` : ""}`, lines);
  return lines.length;
};

/** Sends the summary once per day, at the first tick after 9:00 PKT (04:00 UTC). */
const maybeSummary = async (now = Date.now()) => {
  const hourPkt = new Date(now + PKT_OFFSET).getUTCHours();
  if (hourPkt < 9) return null;
  const key = `daily-summary:${pktDate(now)}`;
  if (await ox.cacheGet(key, 48)) return null;
  await ox.cachePut(key, { at: new Date(now).toISOString() });
  return sendDailySummary(now).then(
    () => "sent",
    (e) => `error: ${(e as Error).message}`,
  );
};

/**
 * Daily guarantee (owner, 2026-11-17): at 23:30 PKT on a weekday (after the UK window closes), if
 * fewer first emails went out than the daily limit, Hamza gets an email saying why, with the funnel.
 */
const maybeShortfall = async (state: State, now = Date.now()) => {
  const local = new Date(now + PKT_OFFSET);
  const day = local.getUTCDay();
  if (day === 0 || day === 6 || local.getUTCHours() * 60 + local.getUTCMinutes() < 23 * 60 + 30) return null;
  const key = `shortfall:${pktDate(now)}`;
  if (await ox.cacheGet(key, 48)) return null;
  await ox.cachePut(key, { at: new Date(now).toISOString() });
  const funnel = await ox.funnel(new Date(pktDayStart(now)).toISOString());
  const cap = dailyCap(state.settings.started_at, state, now);
  if (funnel.sent >= cap) return `limit reached (${funnel.sent}/${cap})`;
  const why = [
    state.settings.paused ? `Outreach is paused: ${state.settings.pause_reason ?? "paused"}.` : "",
    state.ready ? `${state.ready} checked emails are still queued; most recipients were outside their 9:00-17:00 weekday window or the 4-11 minute gaps ran out of day.` : "No checked emails were left in the queue (the buffer ran dry).",
    `Waiting: ${state.backlog_found} businesses to check, ${state.to_prepare} to research and draft.`,
  ].filter(Boolean);
  await sendOwnerAlert(`Outreach: only ${funnel.sent} of ${cap} emails sent today`, [
    `Today (${pktDate(now)}, Pakistan time) ${funnel.sent} first emails went out against a daily limit of ${cap}.`,
    ...why,
    `Funnel today:\n${funnelLines(funnel).join("\n")}`,
    `${SITE.url}/admin/prospects`,
  ]).catch((e) => console.error("outreach alert:", (e as Error).message));
  return `shortfall email sent (${funnel.sent}/${cap})`;
};

export const PHASES = ["imap", "send", "draft", "audit"] as const;
export type Phase = (typeof PHASES)[number];

/** Businesses waiting for their check: above this, scanning waits so the audits catch up. */
export const MAX_BACKLOG = 150;
/** Audits run side by side in a tick (each one mostly waits on their site and PageSpeed). */
const AUDITS_AT_ONCE = 3;

/**
 * Should scanning run now? (owner, 2026-11-23, replaces "only when everything is processed"):
 * - until 150 new businesses were found in the last 24 hours (DAILY_NEW_TARGET), every day,
 *   weekends included, so Monday starts with a full buffer (sending stays Mon-Fri);
 * - after that, only when the ready buffer is low and little is waiting;
 * - never while 150+ businesses wait for their check, or past the 400-a-day safety cap.
 * When an area is finished, the next one starts automatically (discoverRun).
 */
export const discoveryPlan = async (state: State, cap: number) => {
  if (state.found_24h >= MAX_NEW_PER_DAY) return null;
  if (state.backlog_found >= MAX_BACKLOG) return null;
  const area = scanArea(doneSet(await ox.coverage()));
  if (!area) return null;
  if (state.found_24h < DAILY_NEW_TARGET) return `scanning from ${cellLabel(area)} (${state.found_24h}/${DAILY_NEW_TARGET} found in 24 h)`;
  if (state.ready < bufferTarget(cap) && state.backlog_found + state.to_prepare < 20) return `buffer low (${state.ready}/${bufferTarget(cap)}): scanning from ${cellLabel(area)}`;
  return null;
};

/**
 * The scanning job (pg_cron "outreach-discover" every 10 minutes, plus the daily Vercel Cron), apart
 * from the 5-minute tick so audits and drafts keep the whole tick and two OpenStreetMap runs never overlap.
 */
export const discoverTick = async (budgetMs = 50_000) => {
  const start = Date.now();
  const state = await ox.state();
  const plan = await discoveryPlan(state, dailyCap(state.settings.started_at, state));
  await ox.cachePut("discover-ran", { at: new Date().toISOString() }).catch(() => {});
  if (!plan) return { plan: "nothing to scan now", found_24h: state.found_24h, backlog: state.backlog_found };
  return { plan, results: await discoverRun(start + budgetMs - 3_000) };
};

/** The scanning job ran in the last 25 minutes. */
const discoverRanRecently = async () => {
  const v = await ox.cacheGet<{ at: string }>("discover-ran", 1).catch(() => null);
  return !!v && Date.now() - Date.parse(v.at) < 25 * 60_000;
};

/** One scheduler tick. `phases` limits what runs (local tests leave out "send"). */
export const tick = async (phases: Phase[] = [...PHASES], budgetMs = 50_000) => {
  const start = Date.now();
  const left = () => budgetMs - (Date.now() - start);
  const report: Record<string, unknown> = {};
  // "Last tick" in /admin/prospects shows the scheduler is running.
  await ox.set({ last_tick_at: new Date().toISOString() });
  // Address now set: US/Canadian prospects that were waiting go back through qualification.
  if (postalAddress()) report.released = await ox.releaseWaiting();
  // "Needs a look" drafts older than 7 days expire (checked hourly).
  if (!(await ox.cacheGet("expire-reviews", 1))) {
    await ox.cachePut("expire-reviews", { at: new Date().toISOString() });
    report.expired = await ox.expireReviews();
  }
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
  const cut = await spamBlockCheck(state);
  if (cut) {
    report.spamBlocks = cut;
    state = await ox.state();
  }
  const paused = await safetyCheck(state);
  if (paused) {
    report.paused = paused;
    state = await ox.state();
  }
  if (phases.includes("send")) report.send = await sendNext(state);
  if (phases.includes("send")) report.summary = await maybeSummary();
  if (phases.includes("send")) report.shortfall = await maybeShortfall(state);

  const cap = dailyCap(state.settings.started_at, state);
  const target = bufferTarget(cap);
  report.buffer = `${state.ready}/${target}`;
  // Buffer low and businesses already checked: research and draft first, so the queue refills fastest.
  // With many businesses waiting for their check, drafting goes first only every other tick, so audits keep up.
  const draftFirst = state.backlog_found < 20 || Math.floor(Date.now() / 300_000) % 2 === 0;
  if (phases.includes("draft") && draftFirst && state.ready < target && state.to_prepare > 0 && left() > 40_000) report.drafts = await draftNew(state, 2, undefined, undefined, start + budgetMs - 5_000);

  // Scanning runs in its own job (discoverTick). If that job hasn't run for 25 minutes (not scheduled
  // yet, or failing), the tick scans instead on every other tick, leaving the other ticks to audits.
  if (phases.includes("audit") && left() > 35_000 && Math.floor(Date.now() / 300_000) % 2 === 1 && !(await discoverRanRecently())) {
    report.discover = await discoverTick(left() - 5_000).catch((e) => `error: ${(e as Error).message}`);
  }
  // Checks run a few businesses side by side.
  if (phases.includes("audit")) {
    const done: string[] = [];
    // One outreach audit can take ~40 seconds (page, PageSpeed capped at 15 s, contact pages, MX), so a batch only starts with time left.
    while (left() > 40_000) {
      const batch = await ox.toAudit(AUDITS_AT_ONCE);
      if (!batch.length) break;
      done.push(
        ...(await Promise.all(
          batch.map(async (p) => {
            try {
              return `${p.name}: ${await qualify(p as Prospect)}`;
            } catch (e) {
              await ox.skip(p.id, `Check failed: ${(e as Error).message}`.slice(0, 200)).catch(() => {});
              return `${p.name}: check failed (${(e as Error).message})`;
            }
          }),
        )),
      );
    }
    report.audits = done;
  }
  if (phases.includes("draft") && left() > 12_000) {
    if (left() > 30_000 && report.drafts === undefined) report.drafts = await draftNew(state, 2, undefined, undefined, start + budgetMs - 5_000);
    if (left() > 8_000) report.followups = await draftFollowUps(5);
    if (left() > 5_000) report.checkbacks = await draftCheckBacks(5);
  }
  report.ms = Date.now() - start;
  return report;
};
