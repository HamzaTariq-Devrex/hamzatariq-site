// Audit result pieces shared by the free SEO audit tool and the outreach report page (/report/<id>).
// No hooks, so it works in server and client components.
import { GROUP_LABELS, scoreBand, type AuditResult, type Check, type CheckGroup, type CheckStatus } from "@/lib/audit/types";

export const STATUS_LABEL: Record<CheckStatus, string> = { pass: "Good", warn: "Improve", fail: "Fix", skip: "Not measured" };
const ORDER: Record<CheckStatus, number> = { fail: 0, warn: 1, skip: 2, pass: 3 };

export const ScoreRing = ({ score }: { score: number }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className={`audit-ring is-${scoreBand(score)}`} role="img" aria-label={`SEO score ${score} out of 100`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="audit-ring-track" />
        <circle cx="60" cy="60" r={r} className="audit-ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span>
        {score}
        <small>/100</small>
      </span>
    </div>
  );
};

export const CheckItem = ({ check }: { check: Check }) => (
  <li className={`audit-check is-${check.status}`}>
    <span className="audit-pill">{STATUS_LABEL[check.status]}</span>
    <div>
      <h3>{check.label}</h3>
      <p>{check.detail}</p>
      {check.fix && (
        <p className="audit-fix">
          <strong>How to fix:</strong> {check.fix}
        </p>
      )}
    </div>
  </li>
);

/** Every check, grouped, most important first, with the PageSpeed metrics under "Speed". */
export const AuditGroups = ({ result }: { result: AuditResult }) => (
  <>
    {(Object.keys(GROUP_LABELS) as CheckGroup[]).map((g) => {
      const checks = result.checks.filter((c) => c.group === g).sort((a, b) => ORDER[a.status] - ORDER[b.status]);
      if (!checks.length) return null;
      return (
        <section key={g} className="audit-group">
          <h2>{GROUP_LABELS[g]}</h2>
          <ul>
            {checks.map((c) => (
              <CheckItem key={c.id} check={c} />
            ))}
          </ul>
          {g === "speed" && result.pagespeed && (result.pagespeed.field.length > 0 || result.pagespeed.lab.length > 0) && (
            <dl className="audit-metrics">
              {[...result.pagespeed.field.map((m) => ({ ...m, label: `${m.label} (real users)` })), ...result.pagespeed.lab].map((m) => (
                <div key={m.label} className={`is-${m.status}`}>
                  <dt>{m.label}</dt>
                  <dd>{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      );
    })}
  </>
);
