// Labels and groupings for the /admin dashboard. Safe to import in client components.

export const STATUSES = ["new", "replied", "won", "lost"] as const;
export type LeadStatus = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<LeadStatus, string> = { new: "New", replied: "Replied", won: "Won", lost: "Lost" };

export const SOURCES = ["chatbot", "form", "seo-audit", "website-cost-calculator", "chatbot-roi-calculator", "outreach", "tool", "page"] as const;
export const SOURCE_LABELS: Record<string, string> = { chatbot: "Chatbot", form: "Contact form", "seo-audit": "SEO audit",
  "website-cost-calculator": "Cost calculator",
  "chatbot-roi-calculator": "Chatbot ROI",
  outreach: "Outreach",
  tool: "Tools", page: "Page" };

export const SERVICE_GROUPS = [
  { key: "websites", label: "Websites" },
  { key: "dashboards", label: "Dashboards" },
  { key: "chatbots", label: "AI chatbots" },
  { key: "seo", label: "SEO" },
  { key: "other", label: "Other / not set" },
] as const;
export type ServiceKey = (typeof SERVICE_GROUPS)[number]["key"];

/** Maps a lead's project type (from the lead form) to one of the four services. */
export const serviceOf = (projectType: string | null): ServiceKey => {
  switch (projectType) {
    case "Next.js website":
    case "Ecommerce store":
      return "websites";
    case "Dashboard or web app":
      return "dashboards";
    case "AI chatbot":
      return "chatbots";
    case "React / Next.js SEO":
      return "seo";
    default:
      return "other";
  }
};
export const serviceLabel = (projectType: string | null) =>
  SERVICE_GROUPS.find((s) => s.key === serviceOf(projectType))!.label;

// Pakistan time (UTC+5, no daylight saving) decides what "today" and "this week" mean.
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-27" for the Pakistan calendar day of a date. */
export const pktDay = (date: Date | string) => new Date(new Date(date).getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);

/** Start of a Pakistan calendar day ("2026-10-27"), as a UTC timestamp. */
export const pktDayStart = (day: string) => Date.parse(`${day}T00:00:00Z`) - PKT_OFFSET_MS;

/** Start of today in Pakistan time, as a UTC timestamp. */
export const pktStartOfToday = (now = Date.now()) => {
  const shifted = new Date(now + PKT_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - PKT_OFFSET_MS;
};

export const formatDate = (date: string, withTime = true) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Karachi",
  }).format(new Date(date));

// ---------- Outreach (/admin/prospects) ----------

export const PROSPECT_STATUSES = ["found", "audited", "skipped", "waiting", "whatsapp", "messaged", "emailed", "replied", "call", "won", "lost", "unsubscribed", "bounced"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];
export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  found: "New",
  audited: "Audited",
  skipped: "Skipped",
  waiting: "Waiting (US/CA address)",
  whatsapp: "WhatsApp queue",
  messaged: "WhatsApp sent",
  emailed: "Emailed",
  replied: "Replied",
  call: "Call",
  won: "Won",
  lost: "Lost",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
};
/** Statuses the owner can set by hand (the rest come from the pipeline). */
export const MANUAL_PROSPECT_STATUSES: ProspectStatus[] = ["found", "whatsapp", "messaged", "emailed", "replied", "call", "won", "lost", "unsubscribed"];