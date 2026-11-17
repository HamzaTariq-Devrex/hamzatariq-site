// Map tab (owner, 2026-11-17): one call (app_ox_map), areas computed here, Leaflet only in the browser.
import LeadMapLoader from "./LeadMapLoader";
import type { MapArea } from "./LeadMap";
import { ox } from "@/lib/outreach/db";
import { NICHES, areaKey, openAreas } from "@/lib/outreach/coverage";
import { placeQuery } from "@/lib/outreach/areas";
import { areaStep, dailyLog, pktDay, type MapData } from "@/lib/outreach/map";
import { BUSINESS_TYPES } from "@/lib/outreach/osm-types";

const PKT = 5 * 3_600_000;
const pktStart = (t = Date.now()) => Date.parse(`${pktDay(t)}T00:00:00Z`) - PKT;

/** Areas (cities in coverage order) with their step, centre and whether they were worked on today. */
const mapAreas = (d: MapData): MapArea[] => {
  const from = pktStart();
  const touchedToday = (iso: string | null) => !!iso && Date.parse(iso) >= from;
  const areas = openAreas().map((cell) => {
    const cells = d.cells.filter((c) => c.c === cell.country && c.r === cell.region && c.y === cell.city);
    const list = d.businesses.filter((b) => b.c === cell.country && b.y === cell.city && (!b.r || b.r === cell.region));
    const centre = d.centres[`${cell.country}:${placeQuery(cell).toLowerCase().trim()}`];
    return {
      key: areaKey(cell),
      country: cell.country,
      region: cell.region,
      city: cell.city,
      step: areaStep(cells, list, NICHES.length),
      lat: centre ? Number(centre.lat) : null,
      lon: centre ? Number(centre.lon) : null,
      nichesDone: cells.filter((c) => c.done).length,
      niches: NICHES.length,
      activity: list.filter((b) => touchedToday(b.f) || touchedToday(b.sent) || touchedToday(b.ck)).length + cells.filter((c) => touchedToday(c.at)).length,
    };
  });
  const top = [...areas].sort((a, b) => b.activity - a.activity)[0];
  return areas
    .filter((a) => a.step !== "Not started" || a.lat != null)
    .map(({ activity, ...a }) => ({ ...a, today: !!top && top.activity > 0 && a.key === top.key && activity > 0 }));
};

export default async function MapTab() {
  let d: MapData;
  try {
    d = await ox.map();
  } catch (e) {
    return (
      <p className="adm-error" role="alert">
        Could not load the map: {(e as Error).message}
      </p>
    );
  }
  const from = pktStart();
  const niches = NICHES.map((k) => ({ key: k, label: BUSINESS_TYPES[k].label }));
  return <LeadMapLoader businesses={d.businesses} areas={mapAreas(d)} niches={niches} log={dailyLog(d, from, from + 86_400_000, "Today")} />;
}

