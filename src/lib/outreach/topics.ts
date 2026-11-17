// Blog topics for the SEO + content offer (owner, 2026-11-18). "3 blog topics your customers are
// searching for" must be real: each topic comes from a real Google search suggestion (Google's public
// autocomplete, the same suggestions people see while typing), for the niche and the area. Gemini
// Flash-Lite only turns each search into a post title; without it, a plain template is used.
// Fewer than 3 real searches found → null (the reply goes to Hamza as HOT instead of guessing).
import type { Prospect } from "./db";
import { nounFor } from "./osm-types";
import { outreachJson } from "./ai";

/** What customers of each niche search about (seed words only; the searches themselves come from Google). */
const SEEDS: Record<string, string[]> = {
  jewellery: ["engagement rings", "wedding rings", "jewellery repair"],
  clothing: ["dresses", "outfit ideas", "clothes shop"],
  bridal: ["wedding dresses", "bridal shop", "bridesmaid dresses"],
  bags: ["leather bags", "handbags", "leather wallet"],
  shoes: ["shoes", "wide fit shoes", "shoe shop"],
  furniture: ["sofas", "dining table", "furniture shop"],
  beauty: ["facial", "lash extensions", "beauty salon"],
  hairdresser: ["hair colour", "balayage", "hairdresser"],
  spa: ["massage", "spa day", "facial"],
  dentist: ["teeth whitening", "invisalign", "dentist"],
  clinic: ["physiotherapy", "back pain", "sports massage"],
  restaurant: ["restaurant", "best food", "dinner"],
  cafe: ["brunch", "breakfast", "coffee shop"],
  gym: ["personal trainer", "gym", "weight loss"],
  lawyer: ["solicitor", "making a will", "divorce"],
  accountant: ["accountant", "self assessment", "tax return"],
  guesthouse: ["things to do", "where to stay", "weekend break"],
  roofer: ["roof repair", "flat roof", "roofer"],
  plumber: ["boiler", "plumber", "leaking"],
  electrician: ["electrician", "rewiring", "ev charger"],
  cleaning: ["end of tenancy cleaning", "carpet cleaning", "cleaner"],
  courier: ["same day courier", "courier", "parcel delivery"],
  bakery: ["birthday cakes", "bakery", "wedding cakes"],
  barber: ["barber", "fade haircut", "beard trim"],
};

const GL: Record<string, string> = { GB: "uk", AU: "au", NZ: "nz", AE: "ae", US: "us", CA: "ca" };

/** Google's public autocomplete suggestions for one query (real searches), or []. */
const suggest = async (q: string, country: string) => {
  const url = `https://suggestqueries.google.com/complete/search?${new URLSearchParams({ client: "firefox", hl: "en", gl: GL[country] ?? "uk", q })}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  }
};

export type Topic = { search: string; title: string };

/**
 * Up to 3 real searches for this business's niche and area, each with a post title.
 * Questions and searches with the area come first; brand names of other businesses are avoided.
 */
export const blogTopics = async (p: Pick<Prospect, "name" | "business_type" | "osm_tags" | "city" | "country" | "research">): Promise<Topic[] | null> => {
  const city = p.research && p.research.city !== undefined ? p.research.city : p.city;
  const seeds = SEEDS[p.business_type] ?? [nounFor(p.business_type, p.osm_tags ?? {})];
  const queries = seeds.flatMap((s) => [city ? `${s} ${city}` : s, `how much ${s}`, `best ${s}`, `${s} ideas`]);
  const found: string[] = [];
  for (const q of queries) {
    for (const s of await suggest(q, p.country)) {
      const t = s.toLowerCase().trim();
      if (t.split(/\s+/).length < 3 || found.includes(t) || t.includes(p.name.toLowerCase())) continue;
      // "…at sterns": a search about another shop.
      if (/\b(at|from|in) [a-z]+$/.test(t) && !(city && t.endsWith(city.toLowerCase()))) continue;
      if (/\b(near me|open now|opening times|jobs|vacancies|login|amazon|ebay|argos|ikea|primark)\b/.test(t)) continue;
      found.push(t);
    }
    if (found.length >= 12) break;
  }
  const ranked = [...found].sort((a, b) => score(b, city) - score(a, city));
  // Different seeds first, so the 3 topics aren't three versions of one search.
  const picked: string[] = [];
  for (const t of ranked) if (picked.length < 3 && !picked.some((x) => overlap(x, t) > 0.6)) picked.push(t);
  if (picked.length < 3) return null;
  let titles: string[] = [];
  try {
    const out = await outreachJson<{ titles?: string[] }>({
      system:
        'Turn each Google search into a helpful blog post title for a small local business that sells what is searched for. Keep the main words of the search; plain English; no clickbait, no numbers that are not in the search, no brand names. Answer JSON {"titles": ["...", "...", "..."]} in the same order.',
      user: picked.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      maxTokens: 200,
      temperature: 0.4,
    });
    titles = (out.titles ?? []).map((x) => x.trim());
  } catch {
    titles = [];
  }
  return picked.map((search, i) => ({ search, title: titles[i] && overlap(titles[i].toLowerCase(), search) > 0.4 ? titles[i] : template(search) }));
};

const score = (t: string, city: string | null) => (/^(how|what|which|why|when|where|can|do|does|is|are|should)\b/.test(t) ? 3 : 0) + (city && t.includes(city.toLowerCase()) ? 2 : 0) + Math.min(2, t.split(/\s+/).length - 2);
const overlap = (a: string, b: string) => {
  const A = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const B = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const n = [...A].filter((w) => B.has(w)).length;
  return n / Math.max(1, Math.min(A.size, B.size));
};
const template = (s: string) => {
  const t = s.charAt(0).toUpperCase() + s.slice(1);
  return /^(how|what|which|why|when|where|can|do|does|is|are|should)\b/i.test(s) ? `${t}?` : `${t}: a simple guide`;
};
