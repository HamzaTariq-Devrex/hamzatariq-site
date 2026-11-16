// Coverage engine: for each niche below today's target (7 new qualified leads), search its next
// unsearched cell (niche x city) in AREAS order, mark it done, repeat while time allows.
// Progress (percent per country and per niche, current cell) is computed from the same data.
import { ox, type CoverageRow } from "./db";
import { BUSINESS_TYPES, type BusinessType } from "./osm-types";
import { ALL_CELLS, AREAS, cellKey, openCountries, type Cell } from "./areas";
import { discoverCell, setOsmDeadline } from "./osm";

/** New qualified leads wanted per niche per day (owner, 2026-11-16). */
export const DAILY_TARGET_PER_NICHE = 7;
/** A niche with this many businesses still waiting for an audit doesn't need new searches yet. */
const MAX_BACKLOG = 12;
/** New businesses per cell run, and a safety cap per day across all niches (OpenStreetMap fair use). */
const PER_CELL = 25;
export const MAX_NEW_PER_DAY = 400;

export const NICHES = Object.keys(BUSINESS_TYPES) as BusinessType[];

const doneSet = (rows: CoverageRow[]) => new Set(rows.filter((r) => r.done).map((r) => `${r.t}|${r.c}|${r.r}|${r.y}`));

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

/**
 * One discovery run: niches furthest below today's target first. Each searched cell is marked done
 * (an OpenStreetMap error counts as an attempt; three attempts also mark it done).
 */
export const discoverRun = async (deadline = Date.now() + 50_000, onlyType?: string) => {
  const state = await ox.state();
  let budget = Math.max(0, MAX_NEW_PER_DAY - state.found_24h);
  const [rows, stats] = await Promise.all([ox.coverage(), ox.nicheStats()]);
  const done = doneSet(rows);
  const needy = NICHES.filter((t) => !onlyType || t === onlyType)
    .map((t) => ({ t, q: stats[t]?.q ?? 0, backlog: stats[t]?.backlog ?? 0 }))
    .filter((n) => onlyType || (n.q < DAILY_TARGET_PER_NICHE && n.backlog < MAX_BACKLOG))
    .sort((a, b) => a.q - b.q || a.backlog - b.backlog);
  const results: { cell: string; added: number; error?: string }[] = [];
  setOsmDeadline(deadline);
  try {
    for (const n of needy) {
      if (budget <= 0 || deadline - Date.now() < 15_000) break;
      const cell = nextCell(n.t, done);
      if (!cell) continue; // every open cell searched for this niche
      const label = `${n.t}: ${cell.city}, ${cell.region}, ${cell.country}`;
      try {
        const added = await discoverCell(n.t, cell, Math.min(budget, PER_CELL));
        budget -= added;
        await ox.coverageMark(n.t, cell.country, cell.region, cell.city, added, null);
        done.add(cellKey(n.t, cell));
        results.push({ cell: label, added });
      } catch (e) {
        const msg = (e as Error).message;
        // Out of time is not the cell's fault: try it again next run without counting an attempt.
        if (!/No time left/.test(msg)) await ox.coverageMark(n.t, cell.country, cell.region, cell.city, 0, msg);
        results.push({ cell: label, added: 0, error: msg });
      }
    }
  } finally {
    setOsmDeadline(Number.POSITIVE_INFINITY);
  }
  return results;
};
