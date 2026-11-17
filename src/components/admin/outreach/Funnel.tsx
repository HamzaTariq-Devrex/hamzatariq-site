// Pipeline funnel (owner, 2026-11-17): today (Pakistan time) and the last 7 days, from app_ox_funnel.
import type { Funnel as F } from "@/lib/outreach/db";

const STAGES: [keyof F, string][] = [
  ["found", "Businesses found"],
  ["with_email", "With email"],
  ["active", "Active check passed"],
  ["researched", "Researched"],
  ["drafted", "Drafted"],
  ["sent", "Sent"],
];

type Props = {
  today: F;
  week: F;
  ready: number;
  target: number;
  cap: number;
  spamBlocks7d: number;
  bounces7d: number;
};

const Funnel = ({ today, week, ready, target, cap, spamBlocks7d, bounces7d }: Props) => (
  <section className="adm-card ox-funnel" aria-label="Pipeline funnel">
    <div className="adm-card-head">
      <h2>Pipeline</h2>
      <span className="adm-muted">
        Ready to send: <strong className={ready < target ? "ox-low" : ""}>{ready}</strong> / {target} (two days at {cap}/day) · Spam/policy blocks (7 days): {spamBlocks7d} · Bad-address bounces (7 days):{" "}
        {Math.max(0, bounces7d - spamBlocks7d)}
      </span>
    </div>
    <div className="adm-table-wrap">
      <table className="adm-table ox-stats">
        <thead>
          <tr>
            <th scope="col">Stage</th>
            <th scope="col">Today</th>
            <th scope="col">Last 7 days</th>
          </tr>
        </thead>
        <tbody>
          {STAGES.map(([k, label]) => (
            <tr key={k}>
              <td>{label}</td>
              <td>{today[k] as number}</td>
              <td>{week[k] as number}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <details className="ox-ab">
      <summary>Held or skipped, with the reason</summary>
      <div className="adm-grid-2">
        {[
          ["Today", today],
          ["Last 7 days", week],
        ].map(([label, f]) => (
          <div key={label as string}>
            <h3 className="ox-caption">{label as string}</h3>
            {(f as F).held.length ? (
              <ul className="ox-held">
                {(f as F).held.map((h) => (
                  <li key={h.reason}>
                    <strong>{h.n}</strong> {h.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-muted">None.</p>
            )}
          </div>
        ))}
      </div>
    </details>
  </section>
);

export default Funnel;
