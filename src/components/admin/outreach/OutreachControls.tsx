"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/admin/labels";
import { processNow, setPaused } from "@/app/admin/(dashboard)/prospects/actions";

type Props = {
  settings: { paused: boolean; pauseReason: string | null; startedAt: string | null; nextSendAt: string | null; lastImapAt: string | null; lastTickAt: string | null };
  /** pg_cron job active with its Vault secret; null when unknown. */
  scheduler: boolean | null;
  sent24h: number;
  cap: number;
};

const weekOf = (startedAt: string | null) => (startedAt ? Math.floor((Date.now() - Date.parse(startedAt)) / (7 * 86_400_000)) + 1 : null);

/** Global pause switch, approve-first switch and today's sending numbers. */
const OutreachControls = ({ settings, sent24h, cap, scheduler }: Props) => {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ error: string | null; info?: string }>) =>
    start(async () => {
      setMessage(null);
      const res = await fn();
      setMessage(res.error ? { error: true, text: res.error } : res.info ? { error: false, text: res.info } : null);
      router.refresh();
    });

  const week = weekOf(settings.startedAt);

  return (
    <section className={`adm-card ox-controls${settings.paused ? " is-paused" : ""}`} aria-label="Outreach controls">
      <div className="ox-switches">
        <div className="ox-switch-row">
          <div>
            <strong>{settings.paused ? "Outreach is paused" : "Outreach is running"}</strong>
            <p className="adm-muted">{settings.paused ? settings.pauseReason || "Nothing is sent until you resume." : "Emails go out Mon–Fri, 9:00–17:00 in each business's time zone."}</p>
          </div>
          <button type="button" role="switch" aria-checked={!settings.paused} className={`ox-switch${settings.paused ? "" : " is-on"}`} disabled={pending} onClick={() => run(() => setPaused(!settings.paused))}>
            <span className="ox-sr">{settings.paused ? "Resume outreach" : "Pause outreach"}</span>
          </button>
        </div>
        <div className="ox-switch-row">
          <div>
            <strong>Autopilot</strong>
            <p className="adm-muted">Emails that pass every automatic check are sent on their own. Uncertain ones wait in &ldquo;Needs a look&rdquo; for 7 days. You get a summary every morning at 9:00 PKT.</p>
          </div>
        </div>
      </div>
      <dl className="ox-facts">
        <div>
          <dt>Sent, last 24 h</dt>
          <dd>
            {sent24h} / {cap}
          </dd>
        </div>
        <div>
          <dt>Ramp</dt>
          <dd>{week ? `Week ${week}${week >= 4 ? (cap >= 40 ? " · 40/day (healthy)" : " · 30/day (bounces or complaints)") : ""}` : "Not started"}</dd>
        </div>
        <div>
          <dt>Next send</dt>
          <dd>{settings.nextSendAt && Date.parse(settings.nextSendAt) > Date.now() ? formatDate(settings.nextSendAt) : "When approved and in hours"}</dd>
        </div>
        <div>
          <dt>Last tick</dt>
          <dd>
            {settings.lastTickAt ? formatDate(settings.lastTickAt) : "Not yet"}
            {scheduler === false && <span className="adm-error"> · scheduler not set up</span>}
          </dd>
        </div>
        <div>
          <dt>Inbox checked</dt>
          <dd>{settings.lastImapAt ? formatDate(settings.lastImapAt) : "Not yet"}</dd>
        </div>
      </dl>
      <div className="adm-actions">
        <button type="button" className="adm-btn" disabled={pending} onClick={() => run(processNow)}>
          {pending ? "Working…" : "Audit and draft now"}
        </button>
        {message && (
          <p className={message.error ? "adm-error" : "adm-saved"} role="status">
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
};

export default OutreachControls;
