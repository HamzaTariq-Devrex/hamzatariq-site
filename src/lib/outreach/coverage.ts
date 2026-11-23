// Coverage engine (owner, 2026-11-17): area by area. The current area (city, in AREAS order) gets
// every niche scanned (one cell = niche x city), then its list is audited, researched and emailed;
// the tick starts the next area when the current one has nothing left to process and the ready
// buffer is below two days' limit. Progress (percent per country and per niche) uses the same data.
import { ox, type CoverageRow } from "./db";
import { BUSINESS_TYPES, type BusinessType } from "./osm-types";
import { ALL_CELLS, AREAS, cellKey, cellLabel, openCountries, type Cell } from "./areas";
import { discoverCell, OverpassBusy, setOsmDeadline } from "./osm";

/** Shown in the Coverage tab only: new qualified leads per niche per day (the old per-niche target). */
export const DAILY_TARGET_PER_NICHE = 7;
/**
 * New businesses per cell (a niche in a town often has 30-60 with a website or phone; the old 25 cut the
 * rest off for good), the daily scanning target (owner, 2026-11-23: 150+ a day, so about 20 good
 * emails a day are possible) and a safety cap per day (OpenStreetMap fair use).
 */
const PER_CELL = 80;
export const DAILY_NEW_TARGET = 150;
export const MAX_NEW_PER_DAY = 400;

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

/**
 * One discovery run: every niche not yet scanned in the current area, then the next area, until the
 * time runs out (owner, 2026-11-23: the next area starts automatically). Niches never tried come
 * first, then the ones that failed longest ago, so one cell that keeps failing never blocks the area
 * (Leicester's gym cell blocked every run from 19 to 23 Nov). A busy Overpass (every server failed)
 * is not the cell's fault: it is noted without counting an attempt and the run stops until the next
 * one. Any other error counts an attempt; three attempts mark the cell done.
 * `onlyType` (tests, the daily route with ?type=) searches that niche's next cell instead.
 */
export const discoverRun = async (deadline = Date.now() + 50_000, onlyType?: string, maxNew = Number.POSITIVE_INFINITY) => {
  const state = await ox.state();
  let budget = Math.max(0, Math.min(maxNew, MAX_NEW_PER_DAY - state.found_24h));
  const rows = await ox.coverage();
  const done = doneSet(rows);
  const lastTry = new Map(rows.map((r) => [`${r.t}|${r.c}|${r.r}|${r.y}|${r.d ?? ""}`, r.at ? Date.parse(r.at) : 0]));
  const results: { cell: string; added: number; error?: string }[] = [];
  const tried = new Set<string>();
  const nextTodo = (): { t: string; cell: Cell } | null => {
    if (onlyType) {
      const cell = nextCell(onlyType, done);
      return cell && !tried.has(cellKey(onlyType, cell)) ? { t: onlyType, cell } : null;
    }
    // The current area; once all its niches are done (or tried in this run), the next area.
    for (const area of openAreas()) {
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
        // Busy servers: noted (the cell moves to the back), no attempt counted, and the run stops.
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
