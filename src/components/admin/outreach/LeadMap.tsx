"use client";

// Lead map (owner, 2026-11-17): every area outreach has worked on (city → neighbourhood/district),
// coloured by step, and a pin for every business found, coloured by outcome. Leaflet + free
// OpenStreetMap tiles (with attribution); this file is only loaded on the Map tab (next/dynamic).
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { PROSPECT_STATUS_LABELS, type ProspectStatus } from "@/lib/admin/labels";
import { PIN, areaCsv, needsWebsite, nicheCounts, nicheLabel, pinKind, siteClass, type AreaStep, type MapBusiness, type PinKind } from "@/lib/outreach/map";

export type MapArea = {
  key: string;
  country: string;
  region: string;
  city: string;
  step: AreaStep;
  lat: number | null;
  lon: number | null;
  nichesDone: number;
  niches: number;
  today: boolean;
};

type Selection = { city: string; key: string; sub: string | null } | null;

const STEP_COLOR: Record<AreaStep, string> = {
  "Not started": "#6b7280",
  Scanning: "#f59e0b",
  "List ready": "#f59e0b",
  Emailing: "#f59e0b",
  Done: "#10b981",
};
const STEP_LABEL = (s: AreaStep) => (s === "Not started" ? "not started" : s === "Done" ? "done" : "in progress");

const inArea = (b: MapBusiness, a: Pick<MapArea, "country" | "region" | "city">) => b.c === a.country && b.y === a.city && (!b.r || b.r === a.region);
const contactOf = (b: MapBusiness) => [b.e && "email", b.ph && "WhatsApp/phone", b.ig && "Instagram"].filter(Boolean).join(" / ") || "none";
const statusLabel = (s: string) => PROSPECT_STATUS_LABELS[s as ProspectStatus] ?? s;
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** Centre and radius (metres) of a set of points. */
const spread = (pts: MapBusiness[]) => {
  const ok = pts.filter((b) => b.lat != null && b.lon != null);
  if (!ok.length) return null;
  const lat = ok.reduce((s, b) => s + b.lat!, 0) / ok.length;
  const lon = ok.reduce((s, b) => s + b.lon!, 0) / ok.length;
  const r = Math.max(...ok.map((b) => Math.hypot((b.lat! - lat) * 111_000, (b.lon! - lon) * 111_000 * Math.cos((lat * Math.PI) / 180))));
  return { lat, lon, r };
};

const LeadMap = ({ businesses, areas, niches, log }: { businesses: MapBusiness[]; areas: MapArea[]; niches: { key: string; label: string }[]; log: string[] }) => {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const [ready, setReady] = useState(false);
  const [niche, setNiche] = useState("");
  const [kind, setKind] = useState<PinKind | "">("");
  const [sel, setSel] = useState<Selection>(null);

  const shown = useMemo(() => businesses.filter((b) => (!niche || b.t === niche) && (!kind || pinKind(b) === kind)), [businesses, niche, kind]);

  // Leaflet loads in the browser only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(el.current, { zoomControl: true, preferCanvas: true }).setView([54, -2.5], 6);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Areas, neighbourhoods and pins, redrawn when the filters change.
  useEffect(() => {
    const L = LRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    for (const a of areas) {
      const list = businesses.filter((b) => inArea(b, a));
      const s = spread(list);
      const lat = s?.lat ?? a.lat;
      const lon = s?.lon ?? a.lon;
      if (lat == null || lon == null) continue;
      const circle = L.circle([lat, lon], {
        radius: Math.min(15_000, Math.max(1_500, (s?.r ?? 4_000) * 1.1)),
        color: a.today ? "#22d3ee" : STEP_COLOR[a.step],
        weight: a.today ? 3 : 1.5,
        fillOpacity: 0.06,
      });
      circle.bindTooltip(`${a.city}: ${a.step} (${a.nichesDone}/${a.niches} niches scanned)`);
      circle.on("click", () => setSel({ city: a.city, key: a.key, sub: null }));
      circle.addTo(layer);
      // Neighbourhoods/districts from the businesses' address tags.
      const subs = new Map<string, MapBusiness[]>();
      for (const b of list) if (b.a) subs.set(b.a, [...(subs.get(b.a) ?? []), b]);
      for (const [name, sl] of subs) {
        const ss = spread(sl);
        if (!ss) continue;
        const pending = sl.some((b) => b.s === "found" || (b.s === "audited" && !b.sent));
        const sub = L.circle([ss.lat, ss.lon], { radius: Math.min(2_500, Math.max(300, ss.r * 1.2)), color: pending ? "#f59e0b" : "#10b981", weight: 1, dashArray: "4 4", fillOpacity: 0.04 });
        sub.bindTooltip(`${name}, ${a.city}: ${sl.length} businesses`);
        sub.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          setSel({ city: a.city, key: a.key, sub: name });
        });
        sub.addTo(layer);
      }
    }
    for (const b of shown) {
      if (b.lat == null || b.lon == null) continue;
      const k = pinKind(b);
      const m = L.circleMarker([b.lat, b.lon], { radius: 6, color: "#0b0a18", weight: 1, fillColor: PIN[k].color, fillOpacity: 0.95 });
      m.bindPopup(`<strong>${b.n.replace(/</g, "&lt;")}</strong><br>${nicheLabel(b.t, 1)} · ${PIN[k].label}${b.sc != null ? ` · score ${b.sc}` : ""}`);
      m.addTo(layer);
    }
  }, [ready, areas, businesses, shown]);

  const goToday = () => {
    const a = areas.find((x) => x.today) ?? areas.find((x) => x.step !== "Done" && x.step !== "Not started");
    if (!a || !mapRef.current) return;
    const s = spread(businesses.filter((b) => inArea(b, a)));
    const lat = s?.lat ?? a.lat;
    const lon = s?.lon ?? a.lon;
    if (lat != null && lon != null) mapRef.current.setView([lat, lon], 12);
    setSel({ city: a.city, key: a.key, sub: null });
  };

  // Open on today's area (or the one in progress) once the map is ready.
  const opened = useRef(false);
  useEffect(() => {
    if (!ready || opened.current) return;
    opened.current = true;
    goToday();
    // goToday only reads props and refs that are stable for this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const area = sel ? areas.find((a) => a.key === sel.key) : null;
  const list = area ? businesses.filter((b) => inArea(b, area) && (!sel?.sub || b.a === sel.sub) && (!niche || b.t === niche)) : [];
  const title = sel ? (sel.sub ? `${sel.sub}, ${sel.city}` : sel.city) : "";
  const byNiche = [...new Set(list.map((b) => b.t))]
    .map((t) => {
      const l = list.filter((b) => b.t === t);
      return { t, n: l.length, none: l.filter((b) => siteClass(b) === "none").length, weak: l.filter((b) => siteClass(b) === "weak").length, ok: l.filter((b) => siteClass(b) === "ok").length };
    })
    .sort((a, b) => b.n - a.n);
  const need = list.filter((b) => needsWebsite(b) && !["skipped", "bounced", "unsubscribed", "lost"].includes(b.s)).sort((a, b) => (b.ls ?? 0) - (a.ls ?? 0));
  const emailed = list.filter((b) => b.sent);
  const wa = list.filter((b) => b.s === "whatsapp");
  const replied = list.filter((b) => b.rc && b.rc !== "bounce" && b.rc !== "out_of_office");
  const held = list.filter((b) => b.rv || ["skipped", "held"].includes(b.s));

  const exportCsv = () => {
    const blob = new Blob([areaCsv(list)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outreach-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="adm-card ox-map-card">
      <div className="ox-map-log" aria-label="Daily log">
        {log.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <div className="ox-map-tools">
        <label className="adm-field">
          <span>Niche</span>
          <select value={niche} onChange={(e) => setNiche(e.target.value)}>
            <option value="">All niches</option>
            {niches.map((n) => (
              <option key={n.key} value={n.key}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <label className="adm-field">
          <span>Status</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as PinKind | "")}>
            <option value="">All statuses</option>
            {(Object.keys(PIN) as PinKind[]).map((k) => (
              <option key={k} value={k}>
                {PIN[k].label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="adm-btn" onClick={goToday}>
          Today
        </button>
        <span className="adm-muted">{shown.length} businesses shown</span>
      </div>
      <ul className="ox-map-legend" aria-label="Legend">
        {(Object.keys(PIN) as PinKind[]).map((k) => (
          <li key={k}>
            <i style={{ background: PIN[k].color }} /> {PIN[k].label}
          </li>
        ))}
        <li>
          <i className="is-ring" style={{ borderColor: STEP_COLOR["Not started"] }} /> Area not started
        </li>
        <li>
          <i className="is-ring" style={{ borderColor: STEP_COLOR.Scanning }} /> In progress
        </li>
        <li>
          <i className="is-ring" style={{ borderColor: STEP_COLOR.Done }} /> Done
        </li>
        <li>
          <i className="is-ring" style={{ borderColor: "#22d3ee" }} /> Today
        </li>
      </ul>
      <div className={`ox-map-wrap${area ? " has-panel" : ""}`}>
        <div ref={el} className="ox-map" role="region" aria-label="Lead map" />
        {area && (
          <aside className="ox-map-panel" aria-label={`Area ${title}`}>
            <div className="ox-map-panel-head">
              <div>
                <h2>{title}</h2>
                <p className="adm-muted">
                  Step: <strong>{area.step}</strong> ({STEP_LABEL(area.step)}) · {area.nichesDone}/{area.niches} niches scanned
                </p>
              </div>
              <button type="button" className="adm-icon-btn" onClick={() => setSel(null)} aria-label="Close area">
                ×
              </button>
            </div>
            <ol className="ox-steps" aria-label="Order of work">
              {(["Scanning", "List ready", "Emailing", "Done"] as AreaStep[]).map((s) => (
                <li key={s} className={s === area.step ? "is-active" : ""}>
                  {s}
                </li>
              ))}
            </ol>
            <p>
              <strong>{title}:</strong> {list.length ? nicheCounts(list, 12) : "no businesses found yet."}
            </p>
            {byNiche.length > 0 && (
              <div className="adm-table-wrap">
                <table className="adm-table ox-stats">
                  <thead>
                    <tr>
                      <th scope="col">Niche</th>
                      <th scope="col">All</th>
                      <th scope="col">No website</th>
                      <th scope="col">Weak</th>
                      <th scope="col">OK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byNiche.map((r) => (
                      <tr key={r.t}>
                        <td>{nicheLabel(r.t)}</td>
                        <td>{r.n}</td>
                        <td>{r.none}</td>
                        <td>{r.weak}</td>
                        <td>{r.ok}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <h3>Needs a website ({need.length})</h3>
            {need.length ? (
              <ul className="ox-map-list">
                {need.map((b) => (
                  <li key={b.id}>
                    <a href={`?tab=all&p=${b.id}`}>
                      <strong>{b.n}</strong>
                    </a>
                    <span className="adm-muted">
                      {nicheLabel(b.t, 1)} · {b.w ? `weak site (${b.sc})` : "no website"} · contact: {contactOf(b)} · {statusLabel(b.s)}
                    </span>
                    {b.note && <span className="ox-note">{b.note}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-muted">None yet.</p>
            )}
            <h3>What was done</h3>
            <ul className="ox-map-done">
              <li>
                <strong>Emailed ({emailed.length})</strong>
                {emailed.map((b) => (
                  <span key={b.id}>
                    {b.n} · {day(b.sent)}
                  </span>
                ))}
              </li>
              <li>
                <strong>WhatsApp queue ({wa.length})</strong>
                {wa.map((b) => (
                  <span key={b.id}>{b.n}</span>
                ))}
              </li>
              <li>
                <strong>Replied ({replied.length})</strong>
                {replied.map((b) => (
                  <span key={b.id}>
                    {b.n} · {b.rc?.replace("_", " ")}
                  </span>
                ))}
              </li>
              <li>
                <strong>Held or skipped ({held.length})</strong>
                {held.map((b) => (
                  <span key={b.id}>
                    {b.n} · {b.rv ? `Needs a look: ${b.rv}` : (b.why ?? statusLabel(b.s))}
                  </span>
                ))}
              </li>
            </ul>
            <div className="adm-actions">
              <button type="button" className="adm-btn" onClick={exportCsv} disabled={!list.length}>
                Export CSV
              </button>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
};

export default LeadMap;
