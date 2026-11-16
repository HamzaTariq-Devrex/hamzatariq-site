// Coverage progress (server component): percent of cells (niche x city) searched per country and
// per niche, each niche's current cell, and today's qualified leads against the daily target.
import type { Progress } from "@/lib/outreach/coverage";

const pct = (d: number, t: number) => (t ? Math.round((d / t) * 1000) / 10 : 0);

const Bar = ({ value }: { value: number }) => (
  <span className="ox-bar" aria-hidden="true">
    <span style={{ width: `${Math.min(100, value)}%` }} />
  </span>
);

const Coverage = ({ p, today, target }: { p: Progress; today: Record<string, { q: number; backlog: number }>; target: number }) => (
  <div className="adm-grid-2">
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>Coverage by country</h2>
        <span className="adm-muted">UK → Australia → New Zealand → UAE → US → Canada</span>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table ox-stats">
          <thead>
            <tr>
              <th scope="col">Country</th>
              <th scope="col">Cells done</th>
              <th scope="col">Progress</th>
            </tr>
          </thead>
          <tbody>
            {p.countries.map((c) => (
              <tr key={c.country}>
                <td>
                  {c.label}
                  {!c.open && <span className="adm-muted"> · locked until a postal address is set</span>}
                </td>
                <td className="adm-nowrap">
                  {c.done} / {c.total}
                </td>
                <td className="adm-nowrap">
                  <Bar value={pct(c.done, c.total)} /> {pct(c.done, c.total)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>Coverage by niche</h2>
        <span className="adm-muted">Target: {target} new qualified leads per niche per day</span>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table ox-stats">
          <thead>
            <tr>
              <th scope="col">Niche</th>
              <th scope="col">Today</th>
              <th scope="col">Progress</th>
              <th scope="col">Current cell</th>
            </tr>
          </thead>
          <tbody>
            {p.niches.map((n) => (
              <tr key={n.type}>
                <td>{n.label}</td>
                <td className="adm-nowrap">
                  {today[n.type]?.q ?? 0} / {target}
                </td>
                <td className="adm-nowrap">
                  <Bar value={pct(n.done, n.total)} /> {pct(n.done, n.total)}%
                </td>
                <td className="adm-muted">{n.current ? `${n.current.city}, ${n.current.region} (${n.current.country})` : "All open cells done"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </div>
);

export default Coverage;
