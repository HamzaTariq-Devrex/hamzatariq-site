// Website cost calculator: turns a project description into a starting price and delivery time.
// Uses ONLY the real packages, prices and timelines in src/data/services.ts (mirrors
// content/owner/profile.md). Anything without an owner price is listed as "quoted after a free call",
// never priced. Add-on prices (CMS, second language, extra pages) come from ADD_ONS. Shared by the browser UI and /api/leads (which recomputes it from the inputs).
import { ADD_ONS, SERVICES, type PriceTier } from "@/data/services";

export const SITE_TYPES = [
  { id: "website", label: "Business or portfolio website", hint: "Show your services or work and get enquiries" },
  { id: "store", label: "Online store", hint: "Sell products with cart and checkout" },
  { id: "dashboard", label: "Dashboard or internal tool", hint: "Manage orders, data or a team in one place" },
  { id: "webapp", label: "Web app or SaaS", hint: "A product your customers log in to" },
] as const;

export const FEATURES = [
  { id: "cms", label: "Edit content yourself (CMS)" },
  { id: "ecommerce", label: "Sell online (ecommerce)" },
  { id: "chatbot", label: "AI chatbot" },
  { id: "dashboard", label: "Admin dashboard" },
  { id: "logins", label: "Customer logins and accounts" },
  { id: "multilingual", label: "More than one language" },
] as const;

// ASCII ids (sent to /api/leads); labels use an en dash.
export const PAGE_OPTIONS = [
  { id: "1-5", label: "1–5" },
  { id: "6-10", label: "6–10" },
  { id: "11-20", label: "11–20" },
  { id: "20+", label: "20+" },
] as const;

export type SiteType = (typeof SITE_TYPES)[number]["id"];
export type Feature = (typeof FEATURES)[number]["id"];
export type PageOption = (typeof PAGE_OPTIONS)[number]["id"];
export type CostInput = { type: SiteType; pages: PageOption; features: Feature[] };

export type Package = { service: string; serviceSlug: string; name: string; price: number; timeline: string | null };
export type AddOn = { name: string; price: number };
export type Estimate = {
  packages: Package[];
  /** Priced add-ons from ADD_ONS (CMS, second language). */
  addOns: AddOn[];
  /** Sum of the packages' and add-ons' starting prices (USD). */
  from: number;
  /** Delivery time from the packages' timelines, or null when one of them is quoted on the call. */
  delivery: { minDays: number; maxDays: number; label: string } | null;
  /** Requested items without an owner price: shown as "quoted after a free call". */
  quoted: string[];
};

const tier = (serviceSlug: string, name: string): Package => {
  const service = SERVICES.find((s) => s.slug === serviceSlug)!;
  const t: PriceTier | undefined = service.pricing.find((p) => p.name === name);
  if (!t) throw new Error(`Unknown package "${name}" in ${serviceSlug}`);
  return { service: service.name, serviceSlug, name: t.name, price: t.price, timeline: t.timeline ?? null };
};

const PKG = {
  landing: () => tier("nextjs-websites", "Landing page / portfolio website"),
  store: () => tier("nextjs-websites", "Ecommerce store with admin dashboard"),
  storeApp: () => tier("nextjs-websites", "Full ecommerce app"),
  dashboard: () => tier("dashboards", "Custom dashboard"),
  webapp: () => tier("dashboards", "Custom web app"),
  chatbot: () => tier("ai-chatbots", "AI chatbot"),
};

/** "5–7 days" → [5, 7]; "2–3 weeks" → [14, 21]. */
export const parseTimeline = (timeline: string): [number, number] => {
  const m = timeline.match(/(\d+)\s*[–-]\s*(\d+)\s*(day|week)/i);
  if (!m) throw new Error(`Unreadable timeline "${timeline}"`);
  const k = m[3].toLowerCase() === "week" ? 7 : 1;
  return [Number(m[1]) * k, Number(m[2]) * k];
};

const deliveryLabel = (minDays: number, maxDays: number) =>
  maxDays <= 10 ? `${minDays}–${maxDays} days` : `about ${Math.max(1, Math.round(minDays / 7))}–${Math.ceil(maxDays / 7)} weeks`;

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const pageLabel = (id: PageOption) => PAGE_OPTIONS.find((p) => p.id === id)!.label;

export const estimate = ({ type, pages, features }: CostInput): Estimate => {
  const has = (f: Feature) => features.includes(f);
  const packages: Package[] = [];
  const quoted: string[] = [];

  // Main build: the smallest real package that covers the site type and the features that change it.
  const sells = type === "store" || has("ecommerce");
  if (sells) {
    // The store package includes an admin dashboard; customer accounts and orders need the full app.
    packages.push(has("logins") ? PKG.storeApp() : PKG.store());
  } else if (type === "webapp" || has("logins")) {
    packages.push(PKG.webapp());
  } else if (type === "dashboard") {
    packages.push(PKG.dashboard());
  } else {
    packages.push(PKG.landing());
    if (has("dashboard")) packages.push(PKG.dashboard());
  }
  if (has("chatbot")) packages.push(PKG.chatbot());

  const addOns: AddOn[] = [];
  if (has("cms")) addOns.push({ name: ADD_ONS.cms.label, price: ADD_ONS.cms.price });
  if (has("multilingual")) addOns.push({ name: ADD_ONS.language.label, price: ADD_ONS.language.price });
  // How many pages each package includes isn't set yet, so extra pages are priced per page on the call.
  if (pages !== "1-5") quoted.push(`Extra pages (${pageLabel(pages)} pages): ${usd(ADD_ONS.extraPage.price)} each beyond the package`);

  const timelines = packages.map((p) => p.timeline);
  const delivery = timelines.every((t): t is string => !!t)
    ? (() => {
        const [minDays, maxDays] = timelines.map(parseTimeline).reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
        return { minDays, maxDays, label: deliveryLabel(minDays, maxDays) };
      })()
    : null;

  return {
    packages,
    addOns,
    from: packages.reduce((s, p) => s + p.price, 0) + addOns.reduce((s, a) => s + a.price, 0),
    delivery,
    quoted,
  };
};

export const isCostInput = (value: unknown): value is CostInput => {
  const v = value as CostInput;
  return (
    !!v &&
    SITE_TYPES.some((t) => t.id === v.type) &&
    PAGE_OPTIONS.some((p) => p.id === v.pages) &&
    Array.isArray(v.features) &&
    v.features.length <= FEATURES.length &&
    v.features.every((f) => FEATURES.some((x) => x.id === f))
  );
};

/** Plain-text summary for the lead message and emails. */
export const summarizeEstimate = (input: CostInput, e: Estimate) =>
  [
    `Type: ${SITE_TYPES.find((t) => t.id === input.type)!.label}`,
    `Pages: ${pageLabel(input.pages)}`,
    `Features: ${input.features.length ? input.features.map((f) => FEATURES.find((x) => x.id === f)!.label).join(", ") : "none"}`,
    `Packages: ${e.packages.map((p) => `${p.name} (from ${usd(p.price)})`).join(" + ")}`,
    ...(e.addOns.length ? [`Add-ons: ${e.addOns.map((a) => `${a.name} (+${usd(a.price)})`).join(" + ")}`] : []),
    `Starting price: from ${usd(e.from)}`,
    `Delivery: ${e.delivery ? e.delivery.label : "agreed after the free call"}`,
    ...(e.quoted.length ? [`Confirmed on the call: ${e.quoted.join(", ")}`] : []),
  ].join("\n");
