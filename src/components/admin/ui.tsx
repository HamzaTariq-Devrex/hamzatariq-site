import { STATUS_LABELS, type LeadStatus } from "@/lib/admin/labels";

// Small presentational pieces shared by the /admin pages (server-safe).

export const PageHead = ({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) => (
  <header className="adm-head">
    <div>
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </div>
    {children && <div className="adm-head-actions">{children}</div>}
  </header>
);

export const StatusBadge = ({ status }: { status: string }) => (
  <span className={`adm-badge is-${status}`}>{STATUS_LABELS[status as LeadStatus] ?? status}</span>
);

const EMPTY_ICONS = {
  leads: <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M22 11h-6" />,
  chats: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12zM8 12h.01M12 12h.01M16 12h.01" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  search: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3M8 11h6" />,
};

/** Friendly empty state: icon in a soft teal ring, a title and one line of help. */
export const EmptyState = ({
  icon,
  title,
  text,
  compact = false,
  children,
}: {
  icon: keyof typeof EMPTY_ICONS;
  title: string;
  text: string;
  compact?: boolean;
  children?: React.ReactNode;
}) => (
  <div className={`adm-empty${compact ? " is-compact" : ""}`}>
    <span className="adm-empty-icon" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {EMPTY_ICONS[icon]}
      </svg>
    </span>
    <p className="adm-empty-title">{title}</p>
    <p className="adm-empty-text">{text}</p>
    {children}
  </div>
);

/** "+12%" / "−5%" / "New" / "No change" compared with the previous period. */
export const Change = ({ current, previous, unit = "%", label }: { current: number; previous: number | null; unit?: "%" | "pts"; label: string }) => {
  if (previous === null) return <span className="adm-change">{label}</span>;
  let text: string;
  let tone: "up" | "down" | "flat";
  if (unit === "pts") {
    const diff = Math.round((current - previous) * 10) / 10;
    tone = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
    text = diff === 0 ? "No change" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} pts`;
  } else if (previous === 0) {
    tone = current > 0 ? "up" : "flat";
    text = current > 0 ? "New" : "No change";
  } else {
    const pct = Math.round(((current - previous) / previous) * 100);
    tone = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
    text = pct === 0 ? "No change" : `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`;
  }
  return (
    <span className={`adm-change is-${tone}`}>
      <span aria-hidden="true">{tone === "up" ? "↑" : tone === "down" ? "↓" : "→"}</span> {text} <small>{label}</small>
    </span>
  );
};

export const StatCard = ({ label, value, children }: { label: string; value: string; children: React.ReactNode }) => (
  <div className="adm-stat">
    <span className="adm-stat-label">{label}</span>
    <strong className="adm-stat-value">{value}</strong>
    {children}
  </div>
);

/** Horizontal bars for a category breakdown; every bar is labelled with its name and count. */
export const BarList = ({ rows, total }: { rows: { label: string; value: number }[]; total: number }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="adm-barlist">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${r.value} lead${r.value === 1 ? "" : "s"}${total ? ` (${Math.round((r.value / total) * 100)}%)` : ""}`}>
          <div className="adm-barlist-text">
            <span>{r.label}</span>
            <span>
              {r.value}
              {total > 0 && <small> · {Math.round((r.value / total) * 100)}%</small>}
            </span>
          </div>
          <div className="adm-barlist-track">
            <span style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
};
