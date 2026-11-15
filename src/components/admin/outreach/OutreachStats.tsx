// Outreach numbers (server component): one SQL call, app_admin_outreach_stats.
import { BUSINESS_TYPES } from "@/lib/outreach/osm-types";
import type { OutreachStats as Stats } from "@/lib/admin/data";

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 1000) / 10}%` : "–");
const label = (k: string) => BUSINESS_TYPES[k as keyof typeof BUSINESS_TYPES]?.label ?? k;

const Table = ({ title, rows, keyLabel }: { title: string; rows: Stats["by_niche"]; keyLabel: (k: string) => string }) => (
  <div className="adm-table-wrap">
    <table className="adm-table ox-stats">
      <caption className="ox-caption">{title}</caption>
      <thead>
        <tr>
          <th scope="col">{title.startsWith("By subject") ? "Variant" : "Niche"}</th>
          <th scope="col">Emailed</th>
          <th scope="col">Replies</th>
          <th scope="col">Reply rate</th>
          <th scope="col">Positive</th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((r) => (
            <tr key={r.key}>
              <td>{keyLabel(r.key)}</td>
              <td>{r.sent}</td>
              <td>{r.replies}</td>
              <td>{pct(r.replies, r.sent)}</td>
              <td>{r.positive}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={5} className="adm-muted">
              Nothing sent yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const OutreachStats = ({ s }: { s: Stats }) => (
  <section className="adm-card" aria-label="Outreach numbers">
    <div className="ox-facts">
      <div>
        <dt>Emails sent</dt>
        <dd>{s.sent}</dd>
      </div>
      <div>
        <dt>Businesses emailed</dt>
        <dd>{s.prospects_emailed}</dd>
      </div>
      <div>
        <dt>Replies</dt>
        <dd>
          {s.replies} <small className="adm-muted">({pct(s.replies, s.prospects_emailed)})</small>
        </dd>
      </div>
      <div>
        <dt>Positive replies</dt>
        <dd>{s.positive}</dd>
      </div>
      <div>
        <dt>Bounce rate</dt>
        <dd>{pct(s.bounces, s.prospects_emailed)}</dd>
      </div>
    </div>
    <details className="ox-ab">
      <summary>Reply rate by niche and by subject (A/B)</summary>
      <div className="adm-grid-2">
        <Table title="By niche" rows={s.by_niche} keyLabel={label} />
        <Table title="By subject variant" rows={s.by_variant} keyLabel={(k) => (k === "A" ? "A: “{business} website”" : k === "B" ? "B: niche subject" : "No variant")} />
      </div>
    </details>
  </section>
);

export default OutreachStats;
