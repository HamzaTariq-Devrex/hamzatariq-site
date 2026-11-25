// Weekly business import from Geofabrik country extracts (owner, 2026-11-25). Overpass from Vercel kept
// timing out (30 businesses found in 7 days), so the GitHub Actions workflow outreach-import.yml runs this:
//   1. each area in AREAS (open countries GB, AU, NZ, AE) gets its boundary from Nominatim (cached 30 days in
//      outreach_cache; a district without a boundary = 2.5 km around its centre, a town = 8 km);
//   2. per country: download the .osm.pbf, keep only our niches' tags (osmium tags-filter), export GeoJSON
//      lines (osmium export), and read them twice: first to count names and website domains (3+ = a chain),
//      then to build the rows;
//   3. skip at import: no name, no way to reach them, brand/wikidata/operator chains, public bodies,
//      closed/disused tags, prime districts and addresses, store-locator pages, no-website businesses
//      without opening hours or a phone, businesses outside every area;
//   4. upsert into outreach_pool (deduplicated by OSM id and website domain), then mark rows that
//      disappeared from the extract as gone; print the numbers per country and niche.
// The extracts are downloaded to a temp folder and never committed.
//   npx tsx scripts/outreach-import.ts [GB AU NZ AE]
// In GitHub Actions it writes through https://hamzatariq.site/api/outreach/pool with CRON_SECRET (POOL_API
// set); locally (npx tsx --env-file=.env.local …) straight to Supabase with the server secret.
//   DRY=1 prints the numbers without writing; KEEP=1 keeps the downloaded files.
import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, rmSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { ox, type Country, type PoolRow, type PoolStats } from "../src/lib/outreach/db";
import { ALL_CELLS, isPrimeLocation, placeQuery, cellLabel, type Cell } from "../src/lib/outreach/areas";
import { areaKey } from "../src/lib/outreach/coverage";
import { BUSINESS_TYPES, type BusinessType } from "../src/lib/outreach/osm-types";
import { USER_AGENT, domainOf, emailOf, instagramOf, isBigOrganisation, isStoreLocatorPage, phoneOf, websiteOf } from "../src/lib/outreach/osm";
import { emailProblem } from "../src/lib/outreach/email-check";
import { osmClosed } from "../src/lib/outreach/research";

const DRY = process.env.DRY === "1";

/** Where rows go: the secured route (workflow) or Supabase directly (local). */
const API = process.env.POOL_API;
const callApi = async <T>(body: Record<string, unknown> | null): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(API!, {
        method: body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(90_000),
      });
      const j = (await res.json()) as T & { error?: string };
      if (!res.ok) throw new Error(`pool route ${res.status}: ${j.error ?? ""}`);
      return j;
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
};
const store = {
  cacheGet: async <T>(key: string, hours: number) => (API ? (await callApi<{ value: T | null }>({ action: "cache-get", key, hours })).value : ox.cacheGet<T>(key, hours)),
  cachePut: async (key: string, value: unknown) => void (API ? await callApi({ action: "cache-put", key, value }) : await ox.cachePut(key, value)),
  upsert: (rows: PoolRow[]) => (API ? callApi<{ new: number; updated: number; duplicate_domain: number }>({ action: "upsert", rows }) : ox.poolUpsert(rows)),
  finish: async (country: string, since: string) => (API ? (await callApi<{ gone: number }>({ action: "finish", country, since })).gone : ox.poolFinish(country, since)),
  stats: () => (API ? callApi<PoolStats>(null) : ox.poolStats()),
};
const KEEP = process.env.KEEP === "1";

/** Geofabrik extracts. The UK file (not "Great Britain") so Belfast and Derry are included; the GCC file is cut to our UAE areas. */
const EXTRACTS: Record<string, { url: string; label: string }> = {
  GB: { url: "https://download.geofabrik.de/europe/united-kingdom-latest.osm.pbf", label: "United Kingdom" },
  AU: { url: "https://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf", label: "Australia" },
  NZ: { url: "https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf", label: "New Zealand" },
  AE: { url: "https://download.geofabrik.de/asia/gcc-states-latest.osm.pbf", label: "United Arab Emirates" },
};

const countries = (process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(EXTRACTS)).map((c) => c.toUpperCase()).filter((c) => c in EXTRACTS) as Country[];
const work = join(process.env.RUNNER_TEMP ?? tmpdir(), "outreach-import");
mkdirSync(work, { recursive: true });

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const summary = (md: string) => {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const run = (cmd: string, args: string[]) => {
  log("$", cmd, args.join(" "));
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} failed (${r.status})`);
};

// ---------- Area shapes ----------

type Ring = [number, number][]; // [lon, lat]
type Shape = { bbox: [number, number, number, number]; polygons?: Ring[][]; circle?: { lat: number; lon: number; m: number } }; // bbox: s, w, n, e

const ringContains = (ring: Ring, lon: number, lat: number) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const metres = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(x));
};
const inShape = (s: Shape, lat: number, lon: number) => {
  if (lat < s.bbox[0] || lat > s.bbox[2] || lon < s.bbox[1] || lon > s.bbox[3]) return false;
  if (s.circle) return metres(s.circle.lat, s.circle.lon, lat, lon) <= s.circle.m;
  return !!s.polygons?.some(([outer, ...holes]) => ringContains(outer, lon, lat) && !holes.some((h) => ringContains(h, lon, lat)));
};

const circleShape = (lat: number, lon: number, m: number): Shape => {
  const dLat = m / 111_320;
  const dLon = m / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { bbox: [lat - dLat, lon - dLon, lat + dLat, lon + dLon], circle: { lat, lon, m } };
};

let lastNominatim = 0;
/** The area's boundary from Nominatim (same choice as findCity: the first administrative relation), cached 30 days. */
const areaShape = async (cell: Cell): Promise<Shape | null> => {
  const q = placeQuery(cell);
  const key = `nominatim-shape:${cell.country}:${q.toLowerCase()}`;
  const cached = await store.cacheGet<Shape>(key, 24 * 30).catch(() => null);
  if (cached) return cached;
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, countrycodes: cell.country.toLowerCase(), format: "jsonv2", limit: "5", polygon_geojson: "1", polygon_threshold: "0.0005" })}`;
  let res: Response | null = null;
  // Busy (429/5xx) or a network error: up to 4 tries, waiting 5, 10, 20 s.
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await sleep(5000 * 2 ** (attempt - 1));
    const wait = lastNominatim + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    lastNominatim = Date.now();
    res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(30_000) }).catch(() => null);
    if (res && (res.ok || (res.status !== 429 && res.status < 500))) break;
  }
  if (!res?.ok) throw new Error(`Nominatim answered ${res?.status ?? "nothing"} for "${q}"`);
  const rows = (await res.json()) as { lat: string; lon: string; osm_type: string; osm_id: number; display_name: string; boundingbox?: string[]; geojson?: { type: string; coordinates: unknown } }[];
  if (!rows.length) return null;
  const best = rows.find((r) => r.osm_type === "relation" && /Polygon/.test(r.geojson?.type ?? "")) ?? rows[0];
  // The same entry findCity keeps (the /admin Map places its area circles from these centres).
  const bb = best.boundingbox?.map(Number);
  await store
    .cachePut(`nominatim:${cell.country}:${q.toLowerCase().trim()}`, {
      lat: Number(best.lat),
      lon: Number(best.lon),
      area: best.osm_type === "relation" ? 3_600_000_000 + best.osm_id : null,
      name: best.display_name,
      bbox: best.osm_type === "relation" && bb?.length === 4 && bb.every(Number.isFinite) ? [bb[0], bb[1], bb[2], bb[3]] : null,
    })
    .catch(() => {});
  let shape: Shape;
  const g = best.geojson;
  if (g && (g.type === "Polygon" || g.type === "MultiPolygon")) {
    const polygons = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as Ring[][];
    let [s, w, n, e] = [90, 180, -90, -180];
    for (const poly of polygons) for (const [lon, lat] of poly[0]) [s, w, n, e] = [Math.min(s, lat), Math.min(w, lon), Math.max(n, lat), Math.max(e, lon)];
    shape = { bbox: [s, w, n, e], polygons };
  } else {
    // No boundary in OSM (most suburbs): a circle, as the old Overpass search did.
    shape = circleShape(Number(best.lat), Number(best.lon), cell.district ? 2500 : 8000);
  }
  await store.cachePut(key, shape).catch(() => {});
  return shape;
};

// ---------- Tags ----------

/** Our niches' tags as osmium filter expressions (nwr/shop=jewelry,clothes,…). */
const tagIndex = new Map<string, BusinessType>();
for (const [type, def] of Object.entries(BUSINESS_TYPES) as [BusinessType, (typeof BUSINESS_TYPES)[BusinessType]][])
  for (const [k, v] of def.tags) if (!tagIndex.has(`${k}=${v}`)) tagIndex.set(`${k}=${v}`, type);
const byKey = new Map<string, string[]>();
for (const kv of tagIndex.keys()) {
  const [k, v] = kv.split("=");
  byKey.set(k, [...(byKey.get(k) ?? []), v]);
}
const FILTERS = [...byKey.entries()].map(([k, vs]) => `nwr/${k}=${vs.join(",")}`);
const nicheOf = (tags: Record<string, string>): BusinessType | null => {
  for (const [kv, type] of tagIndex) {
    const [k, v] = kv.split("=");
    if (tags[k] === v) return type;
  }
  return null;
};

/** Tags we keep (address, hours, contact, kind of place); the rest is dropped to keep the pool small. */
const KEEP_TAG = /^(name|addr:.*|opening_hours|phone|mobile|contact:.*|website|url|email|facebook|instagram|shop|amenity|craft|office|healthcare|leisure|tourism|cuisine|check_date.*|survey:date|operator|description|start_date)$/;
const keepTags = (tags: Record<string, string>) => Object.fromEntries(Object.entries(tags).filter(([k]) => KEEP_TAG.test(k)));
const facebookOf = (tags: Record<string, string>) => (tags["contact:facebook"] ?? tags.facebook ?? "").split(";")[0].trim() || null;
const normName = (n: string) => n.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

type Feature = { type: "Feature"; geometry: { type: string; coordinates: unknown } | null; properties: Record<string, string | number> };

/** Centre of any geometry (point, or the middle of its bounding box). */
const centre = (g: Feature["geometry"]): [number, number] | null => {
  if (!g) return null;
  if (g.type === "Point") {
    const [lon, lat] = g.coordinates as [number, number];
    return [lat, lon];
  }
  let [s, w, n, e] = [90, 180, -90, -180];
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [lon, lat] = c as [number, number];
      [s, w, n, e] = [Math.min(s, lat), Math.min(w, lon), Math.max(n, lat), Math.max(e, lon)];
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(g.coordinates);
  return s <= n ? [(s + n) / 2, (w + e) / 2] : null;
};

const features = async function* (file: string) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const raw of rl) {
    // geojsonseq lines may start with the record separator character (0x1E).
    const line = (raw.charCodeAt(0) === 0x1e ? raw.slice(1) : raw).trim();
    if (!line) continue;
    try {
      yield JSON.parse(line) as Feature;
    } catch {
      // a broken line is skipped
    }
  }
};
const tagsOf = (f: Feature) => {
  const t: Record<string, string> = {};
  for (const [k, v] of Object.entries(f.properties)) if (!k.startsWith("@")) t[k] = String(v);
  return t;
};

// ---------- One country ----------

type Skips = Record<string, number>;

const importCountry = async (country: Country, areas: { cell: Cell; shape: Shape }[]) => {
  const ex = EXTRACTS[country];
  const pbf = join(work, `${country}.osm.pbf`);
  const filtered = join(work, `${country}-filtered.osm.pbf`);
  const lines = join(work, `${country}.geojsonseq`);
  const started = new Date().toISOString();
  if (!existsSync(pbf)) run("curl", ["-fsSL", "--retry", "3", "-A", USER_AGENT, "-o", pbf, ex.url]);
  run("osmium", ["tags-filter", pbf, ...FILTERS, "-o", filtered, "--overwrite"]);
  if (!KEEP) rmSync(pbf, { force: true });
  run("osmium", ["export", filtered, "-f", "geojsonseq", "-a", "type,id", "-o", lines, "--overwrite"]);
  rmSync(filtered, { force: true });

  // Pass 1: names and website domains across the whole country (3+ places = a chain).
  const names = new Map<string, number>();
  const domains = new Map<string, number>();
  for await (const f of features(lines)) {
    const t = tagsOf(f);
    if (!t.name || !nicheOf(t)) continue;
    names.set(normName(t.name), (names.get(normName(t.name)) ?? 0) + 1);
    const d = domainOf(websiteOf(t));
    if (d) domains.set(d, (domains.get(d) ?? 0) + 1);
  }

  // Pass 2: rows inside our areas.
  const skips: Skips = {};
  const skip = (why: string) => void (skips[why] = (skips[why] ?? 0) + 1);
  const rows: PoolRow[] = [];
  const seenDomain = new Set<string>();
  for await (const f of features(lines)) {
    const t = tagsOf(f);
    const niche = nicheOf(t);
    if (!niche) continue;
    const name = t.name?.trim();
    if (!name) {
      skip("no name");
      continue;
    }
    const c = centre(f.geometry);
    if (!c) continue;
    const area = areas.find((a) => inShape(a.shape, c[0], c[1]));
    if (!area) {
      skip("outside our areas");
      continue;
    }
    const website = websiteOf(t);
    const domain = domainOf(website);
    const rawEmail = emailOf(t);
    const email = rawEmail && !emailProblem(rawEmail) ? rawEmail : null;
    const phone = phoneOf(t);
    const instagram = instagramOf(t);
    const facebook = facebookOf(t);
    if (!website && !email && !phone && !instagram && !facebook) {
      skip("no website, email, phone or social page");
      continue;
    }
    if (isBigOrganisation(t, name)) {
      skip("chain, brand or public body (tags or name)");
      continue;
    }
    if ((names.get(normName(name)) ?? 0) >= 3) {
      skip("same name at 3+ places in the country (chain)");
      continue;
    }
    if (domain && (domains.get(domain) ?? 0) >= 3) {
      skip("same website at 3+ places (chain)");
      continue;
    }
    if (isStoreLocatorPage(website)) {
      skip("store-locator page");
      continue;
    }
    if (isPrimeLocation(t)) {
      skip("prime luxury address");
      continue;
    }
    const closed = osmClosed(t);
    if (closed) {
      skip("closed on OpenStreetMap");
      continue;
    }
    // No website: only with opening hours or a phone on OSM (a sign it's still trading).
    if (!website && !t.opening_hours && !phone) {
      skip("no website and no opening hours or phone");
      continue;
    }
    if (domain) {
      if (seenDomain.has(domain)) {
        skip("same website as another place (kept once)");
        continue;
      }
      seenDomain.add(domain);
    }
    const priority = !website && email ? 1 : website && email ? 2 : website ? 3 : instagram || facebook ? 4 : 5;
    rows.push({
      osm_id: `${f.properties["@type"]}/${f.properties["@id"]}`,
      country,
      niche,
      name,
      lat: Math.round(c[0] * 1e6) / 1e6,
      lon: Math.round(c[1] * 1e6) / 1e6,
      area_key: areaKey(area.cell),
      region: area.cell.region,
      city: area.cell.city,
      district: area.cell.district,
      website,
      domain,
      email,
      phone,
      instagram,
      facebook,
      opening_hours: t.opening_hours ?? null,
      tags: keepTags(t),
      priority,
    });
  }
  if (!KEEP) rmSync(lines, { force: true });

  log(`${country}: ${rows.length} businesses in our areas; skipped ${JSON.stringify(skips)}`);
  const totals = { new: 0, updated: 0, duplicate_domain: 0 };
  if (!DRY) {
    for (let i = 0; i < rows.length; i += 400) {
      const r = await store.upsert(rows.slice(i, i + 400));
      totals.new += r.new;
      totals.updated += r.updated;
      totals.duplicate_domain += r.duplicate_domain;
    }
    const gone = await store.finish(country, started);
    log(`${country}: ${totals.new} new, ${totals.updated} updated, ${totals.duplicate_domain} already in the pool under another OSM id, ${gone} gone since the last import`);
  }
  summary(
    [
      `### ${ex.label}`,
      `${rows.length} businesses kept in our areas (${rows.filter((r) => r.email).length} with an email on OSM, ${rows.filter((r) => !r.website).length} without a website).`,
      DRY ? "" : `Pool: ${totals.new} new, ${totals.updated} updated, ${totals.duplicate_domain} duplicate domains.`,
      "",
      "| Skipped at import | Count |",
      "|---|---:|",
      ...Object.entries(skips)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `| ${k} | ${v} |`),
      "",
    ].join("\n"),
  );
};

// ---------- Main ----------

const main = async () => {
  if (API ? !process.env.CRON_SECRET : !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVER_SECRET))
    throw new Error(API ? "CRON_SECRET is missing." : "Supabase env vars are missing (or set POOL_API + CRON_SECRET).");
  summary(`## Outreach import ${new Date().toISOString().slice(0, 10)}\n`);
  for (const country of countries) {
    const seen = new Set<string>();
    const cells = ALL_CELLS.filter((c) => c.country === country && !seen.has(areaKey(c)) && !!seen.add(areaKey(c)));
    const areas: { cell: Cell; shape: Shape }[] = [];
    const missing: string[] = [];
    for (const cell of cells) {
      try {
        const shape = await areaShape(cell);
        if (shape) areas.push({ cell, shape });
        else missing.push(cellLabel(cell));
      } catch (e) {
        missing.push(`${cellLabel(cell)} (${(e as Error).message})`);
      }
    }
    log(`${country}: ${areas.length}/${cells.length} area shapes${missing.length ? `; missing: ${missing.join(", ")}` : ""}`);
    if (missing.length) summary(`Areas without a shape in ${country} (scanned with Overpass instead): ${missing.join(", ")}\n`);
    await importCountry(country, areas);
  }
  if (DRY) return;
  const s = await store.stats();
  const nicheRows = s.niches.map((n) => `| ${n.country} | ${n.niche} | ${n.total} | ${n.email} | ${n.no_website} | ${n.available} |`);
  summary(
    [
      "## Pool now",
      "| Country | Businesses | With email | With website | No website | Not processed yet | …with email |",
      "|---|---:|---:|---:|---:|---:|---:|",
      ...s.countries.map((c) => `| ${c.country} | ${c.total} | ${c.email} | ${c.website} | ${c.no_website} | ${c.available} | ${c.available_email} |`),
      "",
      "| Country | Niche | Businesses | With email | No website | Not processed yet |",
      "|---|---|---:|---:|---:|---:|",
      ...nicheRows,
    ].join("\n"),
  );
  console.log(JSON.stringify({ countries: s.countries }, null, 1));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
