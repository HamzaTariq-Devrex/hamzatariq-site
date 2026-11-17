// Lead map (owner, 2026-11-17): pure helpers shared by the Map tab in /admin/prospects and the
// 9:00 PKT summary email. Data comes from app_ox_map (one call); nothing here is invented: every count
// is a count of real rows.
import { BUSINESS_TYPES } from "./osm-types";
import { cellLabel } from "./areas";

export type MapBusiness = {
  id: string;
  n: string;
  t: string;
  y: string | null;
  r: string | null;
  c: string;
  a: string | null;
  /** District (borough/suburb) the business was found in; null = the whole town. */
  d: string | null;
  lat: number | null;
  lon: number | null;
  s: string;
  sc: number | null;
  ls: number | null;
  w: boolean;
  e: boolean;
  ph: boolean;
  ig: boolean;
  rc: string | null;
  why: string | null;
  note: string | null;
  f: string;
  ck: string | null;
  sent: string | null;
  rv: string | null;
  q: boolean;
};
export type MapCell = { t: string; c: string; r: string; y: string; d: string; done: boolean; n: number; at: string | null };
export type MapData = { cells: MapCell[]; centres: Record<string, { lat: number; lon: number }>; businesses: MapBusiness[] };

export const PIN = {
  hot: { label: "Hot reply", color: "#f43f5e" },
  replied: { label: "Replied", color: "#f59e0b" },
  emailed: { label: "Emailed", color: "#6d4aff" },
  nosite: { label: "Needs a website (no site)", color: "#22d3ee" },
  weak: { label: "Weak website (under 50)", color: "#3b82f6" },
  ok: { label: "OK website", color: "#10b981" },
  nofit: { label: "Not a fit", color: "#6b7280" },
} as const;
export type PinKind = keyof typeof PIN;

const HOT = new Set(["interested", "price", "question"]);
const NOFIT = new Set(["skipped", "bounced", "unsubscribed", "lost"]);

export const pinKind = (b: MapBusiness): PinKind => {
  if (b.rc && HOT.has(b.rc)) return "hot";
  if (b.rc && b.rc !== "bounce" && b.rc !== "out_of_office") return "replied";
  if (b.sent || b.s === "emailed") return "emailed";
  if (NOFIT.has(b.s)) return "nofit";
  if (!b.w) return "nosite";
  if (b.sc != null && b.sc < 50) return "weak";
  return "ok";
};

/** Needs a website: no site, or a weak one (audit under 50). */
export const needsWebsite = (b: MapBusiness) => !b.w || (b.sc != null && b.sc < 50);
export const siteClass = (b: MapBusiness): "none" | "weak" | "ok" | "unknown" => (!b.w ? "none" : b.sc == null ? "unknown" : b.sc < 50 ? "weak" : "ok");

export const nicheLabel = (t: string, n = 2) => {
  const def = BUSINESS_TYPES[t as keyof typeof BUSINESS_TYPES];
  if (!def) return t;
  if (n === 1) return def.noun;
  // "jeweller" → "jewellers", "beauty salon" → "beauty salons", "bakery" → "bakeries".
  const special: Record<string, string> = { "place to stay": "places to stay", tradesperson: "tradespeople" };
  if (special[def.noun]) return special[def.noun];
  return def.noun.replace(/([^aeiou])y$/, "$1ies").replace(/(s|sh|ch|x)$/, "$1es").replace(/([^s])$/, "$1s");
};

export const cityKey = (b: { c: string; r: string | null; y: string | null; d?: string | null }) => `${b.c}|${b.r ?? ""}|${b.y ?? ""}|${b.d ?? ""}`;
export const areaName = (b: Pick<MapBusiness, "a" | "y">) => (b.a ? `${b.a}, ${b.y ?? ""}`.replace(/, $/, "") : (b.y ?? "Unknown area"));

export type AreaStep = "Not started" | "Scanning" | "List ready" | "Emailing" | "Done";

/** The area's step: Scanning → List ready → Emailing → Done. */
export const areaStep = (cells: MapCell[], businesses: MapBusiness[], niches: number): AreaStep => {
  const done = cells.filter((c) => c.done).length;
  if (!done && !businesses.length) return "Not started";
  if (done < niches) return "Scanning";
  const pending = businesses.some((b) => b.s === "found" || (b.s === "audited" && !b.sent && !b.q && !b.rv));
  if (pending) return "List ready";
  if (businesses.some((b) => b.q || b.rv)) return "Emailing";
  return "Done";
};

const PKT = 5 * 3_600_000;
export const pktDay = (t: number | string) => new Date((typeof t === "string" ? Date.parse(t) : t) + PKT).toISOString().slice(0, 10);
const inRange = (iso: string | null, from: number, to: number) => !!iso && Date.parse(iso) >= from && Date.parse(iso) < to;

/** Niche counts as "14 jewellers, 9 clothing/boutiques…" (largest first). */
export const nicheCounts = (list: MapBusiness[], max = 6) => {
  const by = new Map<string, number>();
  for (const b of list) by.set(b.t, (by.get(b.t) ?? 0) + 1);
  const parts = [...by.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n} ${n === 1 ? nicheLabel(t, 1) : nicheLabel(t)}`);
  return parts.length > max ? `${parts.slice(0, max).join(", ")}…` : parts.join(", ");
};

/**
 * Daily log, one line per area worked on in [from, to) (owner, 2026-11-18: today's numbers and the
 * area total are labelled apart): "Today: Harrow, London. Today: found 25 businesses (14 jewellers…),
 * 17 need a website. Total in this area: 55. Emailed today 12, WhatsApp queue 5."
 */
export const dailyLog = (data: MapData, from: number, to: number, label = "Today") => {
  const touched = data.businesses.filter((b) => inRange(b.f, from, to) || inRange(b.sent, from, to) || inRange(b.ck, from, to));
  const byArea = new Map<string, MapBusiness[]>();
  for (const b of touched) byArea.set(cityKey(b), [...(byArea.get(cityKey(b)) ?? []), b]);
  const lines: string[] = [];
  const when = label === "Today" ? "today" : "that day";
  for (const [key, list] of [...byArea.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const found = list.filter((b) => inRange(b.f, from, to));
    const total = data.businesses.filter((b) => cityKey(b) === key).length;
    const where = list[0].y ? cellLabel({ city: list[0].y, district: list[0].d ?? "" }) : "Unknown area";
    const need = found.filter(needsWebsite).length;
    const emailed = list.filter((b) => inRange(b.sent, from, to)).length;
    const wa = list.filter((b) => b.s === "whatsapp" && inRange(b.ck, from, to)).length;
    lines.push(
      `${label}: ${where}. ${found.length ? `${label === "Today" ? "Today" : "That day"}: found ${found.length} business${found.length === 1 ? "" : "es"} (${nicheCounts(found)}), ${need} need${need === 1 ? "s" : ""} a website.` : `No new businesses found ${when}.`} Total in this area: ${total}. Emailed ${when} ${emailed}, WhatsApp queue ${wa}.`,
    );
  }
  return lines.length ? lines : [`${label}: no area worked on.`];
};

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV export for one area (no email addresses or phone numbers: only whether each was found). */
export const areaCsv = (list: MapBusiness[]) => {
  const head = ["Business", "Niche", "City", "Area", "Website", "Audit score", "Lead score", "Email found", "Phone/WhatsApp found", "Instagram found", "Status", "Emailed", "Reply", "Held or skipped because", "Research note"];
  const rows = list.map((b) => [
    b.n,
    nicheLabel(b.t, 1),
    b.y,
    b.a,
    b.w ? "yes" : "no",
    b.sc,
    b.ls,
    b.e ? "yes" : "no",
    b.ph ? "yes" : "no",
    b.ig ? "yes" : "no",
    PIN[pinKind(b)].label,
    b.sent ? b.sent.slice(0, 10) : "",
    b.rc ?? "",
    b.rv ?? b.why ?? "",
    b.note ?? "",
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
};
