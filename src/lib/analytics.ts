// Site events: sent to Vercel Web Analytics (custom events show there on Pro plans) and stored in
// Supabase `events`, which the /admin overview counts. chat_started, lead_submitted and audit_run
// are written by the server when they happen (app_log_chat, app_create_lead, app_save_audit), so the
// browser only sends the others to /api/events. Browser-only module.
import { track } from "@vercel/analytics";

export const EVENT_NAMES = ["chat_started", "lead_submitted", "tool_used", "audit_run", "booking_clicked", "cv_downloaded", "audit_cta_click"] as const;
export { AUDIT_CTA_LOCATIONS, type AuditCtaLocation } from "@/data/tools";
export type EventName = (typeof EVENT_NAMES)[number];
/** Events the browser reports to /api/events (the rest are logged server-side). */
export const CLIENT_EVENTS = ["tool_used", "booking_clicked", "cv_downloaded", "audit_cta_click"] as const;

type Props = Record<string, string | number | boolean | null>;

export const trackEvent = (name: EventName, props: Props = {}) => {
  try {
    track(name, props);
  } catch {
    // Analytics must never break the page.
  }
  if (!(CLIENT_EVENTS as readonly string[]).includes(name)) return;
  try {
    const body = JSON.stringify({ name, page: window.location.pathname, data: props });
    if (!navigator.sendBeacon?.("/api/events", body)) {
      fetch("/api/events", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // ignore
  }
};

const once = new Set<string>();
/** tool_used once per tool per page view (calculators recompute on every change). */
export const trackToolUsed = (tool: string) => {
  if (once.has(tool)) return;
  once.add(tool);
  trackEvent("tool_used", { tool });
};
