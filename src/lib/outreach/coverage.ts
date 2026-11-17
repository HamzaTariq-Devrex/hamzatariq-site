// Coverage engine (owner, 2026-11-17): area by area. The current area (city, in AREAS order) gets
// every niche scanned (one cell = niche x city), then its list is audited, researched and emailed;
// the tick starts the next area when the current one has nothing left to process and the ready
// buffer is below two days' limit. Progress (percent per country and per niche) uses the same data.
import { ox, type CoverageRow } from "./db";
import { BUSINESS_TYPES, type BusinessType } from "./osm-types";
import { ALL_CELLS, AREAS, cellKey, cellLabel, openCountries, type Cell } from "./areas";
import { discoverCell, setOsmDeadline } from "./osm";

/** Shown in the Coverage tab only: new qualified leads per niche per day (the old per-niche target). */
export const DAILY_TARGET_PER_NICHE = 7;
/** New businesses per cell run, and a safety cap per day across all niches (OpenStreetMap fair use). */
const PER_CELL = 25;
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
 * One discovery run in the current area: every niche not yet scanned there, in order. Each searched
 * cell is marked done (an OpenStreetMap error counts as an attempt; three attempts also mark it done).
 * `onlyType` (tests, the daily route with ?type=) searches that niche's next cell instead.
 */
export const discoverRun = async (deadline = Date.now() + 50_000, onlyType?: string) => {
  const state = await ox.state();
  let budget = Math.max(0, MAX_NEW_PER_DAY - state.found_24h);
  const rows = await ox.coverage();
  const done = doneSet(rows);
  const area = onlyType ? null : scanArea(done);
  const todo: { t: string; cell: Cell }[] = onlyType
    ? [nextCell(onlyType, done)].filter((c): c is Cell => !!c).map((cell) => ({ t: onlyType, cell }))
    : area
      ? NICHES.filter((t) => !done.has(cellKey(t, area))).map((t) => ({ t, cell: area }))
      : [];
  const results: { cell: string; added: number; error?: string }[] = [];
  setOsmDeadline(deadline);
  try {
    for (const n of todo) {
      if (budget <= 0 || deadline - Date.now() < 15_000) break;
      const cell = n.cell;
      const label = `${n.t}: ${cellLabel(cell)}, ${cell.country}`;
      try {
        const added = await discoverCell(n.t, cell, Math.min(budget, PER_CELL));
        budget -= added;
        await ox.coverageMark(n.t, cell.country, cell.region, cell.city, cell.district, added, null);
        done.add(cellKey(n.t, cell));
        results.push({ cell: label, added });
      } catch (e) {
        const msg = (e as Error).message;
        // Out of time is not the cell's fault: try it again next run without counting an attempt.
        // A timeout caused by this run's own deadline (big cities like London) doesn't count either.
        if (!/No time left/.test(msg) && !(/abort|timeout/i.test(msg) && deadline - Date.now() < 8_000)) await ox.coverageMark(n.t, cell.country, cell.region, cell.city, cell.district, 0, msg);
        results.push({ cell: label, added: 0, error: msg });
      }
    }
  } finally {
    setOsmDeadline(Number.POSITIVE_INFINITY);
  }
  return results;
};
