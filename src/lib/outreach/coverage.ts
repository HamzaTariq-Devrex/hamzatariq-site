// Coverage engine (owner, 2026-11-17): area by area. The current area (city, in AREAS order) gets
// every niche scanned (one cell = niche x city), then its list is audited, researched and emailed;
// the next area starts automatically. Progress (percent per country and per niche) uses the same data.
// Owner, 2026-11-25: businesses come from the weekly Geofabrik import (outreach_pool, see
// scripts/outreach-import.ts); Overpass is only the fallback for an area with no pool data.
import { ox, type CoverageRow } from "./db";
import { BUSINESS_TYPES, type BusinessType } from "./osm-types";
import { ALL_CELLS, AREAS, cellKey, cellLabel, openCountries, type Cell } from "./areas";
import { addFromPool, discoverCell, OverpassBusy, setOsmDeadline } from "./osm";

/** Shown in the Coverage tab only: new qualified leads per niche per day (the old per-niche target). */
export const DAILY_TARGET_PER_NICHE = 7;
/**
 * New businesses per Overpass cell (fallback only), the daily scanning target (owner, 2026-11-25: at
 * least 200 processed a day, weekends included, so Monday starts full: 250 taken from the pool) and a
 * safety cap per day. One run adds at most POOL_PER_RUN prospects.
 */
const PER_CELL = 80;
export const DAILY_NEW_TARGET = 250;
export const MAX_NEW_PER_DAY = 500;
const POOL_PER_RUN = 60;

export const NICHES = Object.keys(BUSINESS_TYPES) as BusinessType[];

export const doneSet = (rows: CoverageRow[]) => new Set(rows.filter((r) => r.done).map((r) => `${r.t}|${r.c}|${r.r}|${r.y}|${r.d ?? ""}`));

/** The next unsearched cell for a niche, in coverage order, in open countries only. */
export const nextCell = (type: string, done: Set<string>, open = openCountries()): Cell | null =>
  ALL_CELLS.find((c) => open.includes(c.country) && !done.has(cellKey(type, c))) ?? null;

export type Progress = {
  countries: { country: string; label: string; open: boolean; done: number; total: number }[];
  niches: { type: string; label: string; done: number; total: number; current: Cell | null }[];
};

/** Percent done per country (all niches) and per niche (open countries), plus each niche's current cell. */
export const progress = (rows: CoverageRow[]): Progress => {
  const done = doneSet(rows);
  const open = openCountries();
  const countries = AREAS.map((a) => {
    const cells = ALL_CELLS.filter((c) => c.country === a.country);
    const total = cells.length * NICHES.length;
    const d = NICHES.reduce((n, t) => n + cells.filter((c) => done.has(cellKey(t, c))).length, 0);
    return { country: a.country, label: a.label, open: open.includes(a.country), done: d, total };
  });
  const openCells = ALL_CELLS.filter((c) => open.includes(c.country));
  const niches = NICHES.map((t) => ({
    type: t,
    label: BUSINESS_TYPES[t].label,
    done: openCells.filter((c) => done.has(cellKey(t, c))).length,
    total: openCells.length,
    current: nextCell(t, done, open),
  }));
  return { countries, niches };
};

// ---------- Area by area (owner, 2026-11-17) ----------
// One area (city) at a time: scan every niche there and build the full list, then audit, research
// and email the ones that need a website (best leads first), then move to the next area.

export const areaKey = (c: Pick<Cell, "country" | "region" | "city" | "district">) => `${c.country}|${c.region}|${c.city}|${c.district ?? ""}`;
/** Cities in coverage order, open countries only, without duplicates. */
export const openAreas = (open = openCountries()) => {
  const seen = new Set<string>();
  return ALL_CELLS.filter((c) => open.includes(c.country) && !seen.has(areaKey(c)) && !!seen.add(areaKey(c)));
};
/** The first area with a niche not yet scanned. */
export const scanArea = (done: Set<string>, open = openCountries()) => openAreas(open).find((a) => NICHES.some((t) => !done.has(cellKey(t, a)))) ?? null;

/** Rows taken from the pool for one area: added as prospects, cells marked done when nothing is left. */
const poolArea = async (area: Cell, budget: number, done: Set<string>) => {
  const take = await ox.poolTake(areaKey(area), budget);
  if (!take.has_pool) return null;
  const found: Record<string, number> = {};
  for (const row of take.rows) if (await addFromPool(row)) found[row.niche] = (found[row.niche] ?? 0) + 1;
  const added = Object.values(found).reduce((a, b) => a + b, 0);
  for (const t of NICHES) {
    const key = cellKey(t, area);
    if (done.has(key)) continue;
    const left = take.left[t] ?? 0;
    if (!left) {
      await ox.coverageMark(t, area.country, area.region, area.city, area.district, found[t] ?? 0, null);
      done.add(key);
    } else if (found[t]) {
      // More of this niche waits in the pool: counted, not done, no attempt used.
      await ox.coverageMark(t, area.country, area.region, area.city, area.district, found[t], "In progress: more businesses waiting in the pool", false);
    }
  }
  return { added, taken: take.rows.length, areaDone: NICHES.every((t) => done.has(cellKey(t, area))) };
};

/**
 * One discovery run (owner, 2026-11-25): the current area takes its best businesses from the imported
 * pool (no website + email first, then websites with an email, then the rest), up to the budget; when
 * the area's pool is empty its cells are done and the next area starts in the same run. `ahead` (behind
 * at 14:00 UK) also takes from the next area. An area with no pool data at all falls back to Overpass,
 * niche by niche (overpassRun), for that one area only.
 * `onlyType` (tests, the daily route with ?type=) searches that niche's next cell on Overpass instead.
 */
export const discoverRun = async (deadline = Date.now() + 50_000, onlyType?: string, maxNew = Number.POSITIVE_INFINITY, ahead = false) => {
  const state = await ox.state();
  let budget = Math.max(0, Math.min(maxNew, MAX_NEW_PER_DAY - state.found_24h, POOL_PER_RUN * (ahead ? 2 : 1)));
  const rows = await ox.coverage();
  const done = doneSet(rows);
  const results: { cell: string; added: number; error?: string }[] = [];
  if (onlyType) return overpassRun(deadline, budget, rows, done, null, onlyType);
  let touched = 0;
  for (const area of openAreas()) {
    if (budget <= 0 || deadline - Date.now() < 10_000) break;
    if (NICHES.every((t) => done.has(cellKey(t, area)))) continue;
    const r = await poolArea(area, ahead && touched === 0 ? Math.ceil(budget / 2) : budget, done);
    if (!r) return [...results, ...(await overpassRun(deadline, budget, rows, done, area))];
    budget -= r.added;
    results.push({ cell: `pool: ${cellLabel(area)}, ${area.country}`, added: r.added });
    touched++;
    // Area not finished: stop here, unless we're behind and may also take from the next area.
    if (!r.areaDone && !(ahead && touched === 1)) break;
    if (ahead && touched >= 2) break;
  }
  return results;
};

/**
 * Overpass, niche by niche (fallback for an area without pool data, and tests): niches never tried
 * come first, then the ones that failed longest ago, so one failing cell never blocks the area. A busy
 * Overpass (every server failed) is noted without counting an attempt and the run stops; any other
 * error counts one; three mark the cell done.
 */
const overpassRun = async (deadline: number, budgetIn: number, rows: CoverageRow[], done: Set<string>, onlyArea: Cell | null, onlyType?: string) => {
  let budget = budgetIn;
  const lastTry = new Map(rows.map((r) => [`${r.t}|${r.c}|${r.r}|${r.y}|${r.d ?? ""}`, r.at ? Date.parse(r.at) : 0]));
  const results: { cell: string; added: number; error?: string }[] = [];
  const tried = new Set<string>();
  const nextTodo = (): { t: string; cell: Cell } | null => {
    if (onlyType) {
      const cell = nextCell(onlyType, done);
      return cell && !tried.has(cellKey(onlyType, cell)) ? { t: onlyType, cell } : null;
    }
    for (const area of onlyArea ? [onlyArea] : openAreas()) {
      const left = NICHES.filter((t) => !done.has(cellKey(t, area)));
      if (!left.length) continue;
      const fresh = left.filter((t) => !tried.has(cellKey(t, area)));
      if (!fresh.length) return null; // everything left here failed in this run: try again next run
      fresh.sort((a, b) => (lastTry.get(cellKey(a, area)) ?? 0) - (lastTry.get(cellKey(b, area)) ?? 0));
      return { t: fresh[0], cell: area };
    }
    return null;
  };
  setOsmDeadline(deadline);
  try {
    for (let n = nextTodo(); n; n = nextTodo()) {
      if (budget <= 0 || deadline - Date.now() < 12_000) break;
      const { cell, t } = n;
      const key = cellKey(t, cell);
      tried.add(key);
      const label = `${t}: ${cellLabel(cell)}, ${cell.country}`;
      try {
        const added = await discoverCell(t, cell, Math.min(budget, PER_CELL));
        budget -= added;
        await ox.coverageMark(t, cell.country, cell.region, cell.city, cell.district, added, null);
        done.add(key);
        results.push({ cell: label, added });
      } catch (e) {
        const msg = (e as Error).message;
        results.push({ cell: label, added: 0, error: msg });
        if (/No time left/.test(msg)) break;
        const busy = e instanceof OverpassBusy;
        await ox.coverageMark(t, cell.country, cell.region, cell.city, cell.district, 0, msg, !busy).catch(() => {});
        if (busy) break;
      }
    }
  } finally {
    setOsmDeadline(Number.POSITIVE_INFINITY);
  }
  return results;
};
