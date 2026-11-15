// OpenStreetMap only (free, no key): Nominatim finds the city, Overpass lists businesses of one type
// inside it that have a website, phone or email tag. Both services ask for an identifying
// User-Agent, at most 1 request per second and caching, so every response is cached in Supabase.
import { ox, type Country, type Search } from "./db";

export const USER_AGENT = "HamzaTariqOutreach/1.0 (+https://hamzatariq.site)";

export { BUSINESS_TYPES, isBusinessType, type BusinessType } from "./osm-types";
import { BUSINESS_TYPES, isBusinessType, type BusinessType } from "./osm-types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;
/** Fetch from an OSM service, never more than one request per second from this process. */
const osmFetch = async (url: string, init: RequestInit = {}) => {
  const wait = lastRequest + 1100 - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  const res = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(init.headers ?? {}) }, signal: AbortSignal.timeout(75000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
  return res.json();
};

type Place = { lat: number; lon: number; area: number | null; name: string };

/** City → coordinates and its OSM area id (cached 30 days). */
export const findCity = async (city: string, country: Country): Promise<Place> => {
  const key = `nominatim:${country}:${city.toLowerCase().trim()}`;
  const cached = await ox.cacheGet<Place>(key, 24 * 30);
  if (cached) return cached;
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: city, countrycodes: country.toLowerCase(), format: "jsonv2", limit: "5", addressdetails: "0" })}`;
  const rows = (await osmFetch(url)) as { lat: string; lon: string; osm_type: string; osm_id: number; display_name: string; addresstype?: string }[];
  if (!rows.length) throw new Error(`OpenStreetMap doesn't know "${city}" in ${country}.`);
  // Prefer the administrative boundary (a relation), which becomes an Overpass area.
  const best = rows.find((r) => r.osm_type === "relation") ?? rows[0];
  const place: Place = {
    lat: Number(best.lat),
    lon: Number(best.lon),
    area: best.osm_type === "relation" ? 3_600_000_000 + best.osm_id : null,
    name: best.display_name,
  };
  await ox.cachePut(key, place);
  return place;
};

const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];

export type OsmBusiness = { osmId: string; name: string; tags: Record<string, string>; lat: number; lon: number };

/** Businesses of one type in the area that have a website, phone or email tag (cached 24 hours). */
export const findBusinesses = async (type: BusinessType, place: Place): Promise<OsmBusiness[]> => {
  const key = `overpass:${type}:${place.area ?? `${place.lat.toFixed(3)},${place.lon.toFixed(3)}`}`;
  const cached = await ox.cacheGet<OsmBusiness[]>(key, 24);
  if (cached) return cached;
  // With an area, search inside it; otherwise 8 km around the city centre.
  const scope = place.area ? `area(${place.area})->.a;` : "";
  const filter = place.area ? "(area.a)" : `(around:8000,${place.lat},${place.lon})`;
  const union = BUSINESS_TYPES[type].tags.map(([k, v]) => `nwr["${k}"="${v}"]["name"]${filter};`).join("");
  const query = `[out:json][timeout:60];${scope}(${union})->.p;nwr.p[~"^(website|contact:website|email|contact:email|phone|contact:phone)$"~"."];out center tags 500;`;
  // The main Overpass server is often busy (502/504/429); the public mirrors serve the same OSM data.
  let data: { elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] } | null = null;
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      data = await osmFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }).toString(),
      });
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (!data) throw lastError instanceof Error ? lastError : new Error("Overpass is busy. Try again later.");
  const list = data.elements
    .filter((e) => e.tags?.name)
    .map((e) => ({ osmId: `${e.type}/${e.id}`, name: e.tags!.name, tags: e.tags!, lat: e.lat ?? e.center?.lat ?? place.lat, lon: e.lon ?? e.center?.lon ?? place.lon }));
  await ox.cachePut(key, list);
  return list;
};

/** IANA time zone from the country and position (good enough for business hours). */
export const timezoneFor = (country: Country, lat: number, lon: number) => {
  switch (country) {
    case "GB":
      return "Europe/London";
    case "AE":
      return "Asia/Dubai";
    case "US":
      if (lat > 50 && lon < -130) return "America/Anchorage";
      if (lat < 23 && lon < -150) return "Pacific/Honolulu";
      return lon > -87.5 ? "America/New_York" : lon > -101 ? "America/Chicago" : lon > -114 ? "America/Denver" : "America/Los_Angeles";
    case "CA":
      return lon > -60 ? "America/St_Johns" : lon > -67 ? "America/Halifax" : lon > -90 ? "America/Toronto" : lon > -102 ? "America/Winnipeg" : lon > -120 ? "America/Edmonton" : "America/Vancouver";
    case "AU":
      if (lon < 129) return "Australia/Perth";
      if (lon < 141) return lat < -26 ? "Australia/Adelaide" : "Australia/Darwin";
      return lat > -29 ? "Australia/Brisbane" : "Australia/Sydney";
  }
};

const firstTag = (tags: Record<string, string>, keys: string[]) => keys.map((k) => tags[k]).find((v) => v?.trim())?.split(";")[0].trim() ?? null;

export const websiteOf = (tags: Record<string, string>) => {
  const raw = firstTag(tags, ["website", "contact:website", "url"]);
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    return /\./.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
};
export const emailOf = (tags: Record<string, string>) => {
  const e = firstTag(tags, ["email", "contact:email"])?.replace(/^mailto:/i, "").toLowerCase() ?? null;
  return e && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e) ? e : null;
};
export const phoneOf = (tags: Record<string, string>) => firstTag(tags, ["phone", "contact:phone", "contact:mobile", "mobile", "contact:whatsapp"]);

/** Instagram profile URL from an OSM tag or a link, or null. */
export const instagramOf = (tags: Record<string, string>) => {
  const raw = firstTag(tags, ["contact:instagram", "instagram"]);
  return raw ? normalizeInstagram(raw) : null;
};
export const normalizeInstagram = (raw: string) => {
  const handle = raw.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").split(/[/?#]/)[0];
  return /^[a-z0-9._]{2,30}$/i.test(handle) && !["p", "reel", "explore", "accounts", "stories"].includes(handle.toLowerCase()) ? `https://www.instagram.com/${handle}/` : null;
};

/** Chains, franchises, big brands, government, schools and hospitals are never prospects. */
export const isBigOrganisation = (tags: Record<string, string>, name: string) =>
  !!(tags.brand || tags["brand:wikidata"] || tags["operator:wikidata"] || tags["brand:wikipedia"]) ||
  ["government", "public", "national", "regional", "municipal"].includes((tags["operator:type"] ?? "").toLowerCase()) ||
  ["hospital", "school", "college", "university", "kindergarten"].includes(tags.amenity ?? "") ||
  /\b(nhs|council|borough|government|ministry|university|college|hospital|primary school|secondary school|academy trust|police)\b/i.test(name);

export const domainOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

/** Discovery for one saved search: adds up to `budget` new businesses, returns how many. */
export const discover = async (search: Search, budget: number) => {
  // No US until a postal address is in the footer (CAN-SPAM).
  if (!isBusinessType(search.business_type) || budget <= 0 || search.country === "US") return 0;
  const place = await findCity(search.city, search.country);
  const timezone = timezoneFor(search.country, place.lat, place.lon);
  const businesses = await findBusinesses(search.business_type, place);
  // Chains: the same name three or more times in one city.
  const key = (n: string) => n.toLowerCase().trim();
  const nameCount = new Map<string, number>();
  for (const b of businesses) nameCount.set(key(b.name), (nameCount.get(key(b.name)) ?? 0) + 1);
  let added = 0;
  for (const b of businesses) {
    if (added >= budget) break;
    if (isBigOrganisation(b.tags, b.name) || (nameCount.get(key(b.name)) ?? 0) >= 3) continue;
    const website = websiteOf(b.tags);
    const id = await ox.addProspect({
      search_id: search.id,
      osm_id: b.osmId,
      name: b.name,
      business_type: search.business_type,
      city: search.city,
      country: search.country,
      timezone,
      website,
      domain: domainOf(website),
      phone: phoneOf(b.tags),
      email: emailOf(b.tags),
      instagram: instagramOf(b.tags),
      osm_tags: b.tags,
    });
    if (id) added++;
  }
  await ox.searchRan(search.id, { lat: place.lat, lon: place.lon, osm_area: place.area, timezone, last_found: added });
  return added;
};
