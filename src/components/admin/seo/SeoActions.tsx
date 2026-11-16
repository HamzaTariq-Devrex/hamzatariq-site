"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideFix, decideKeyword, syncNow } from "@/app/admin/(dashboard)/seo/actions";

/** Approve / dismiss / retry buttons on a fix row. */
export const FixButtons = ({ id, status }: { id: string; status: string }) => {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const act = (d: "approve" | "dismiss" | "retry") =>
    start(async () => {
      const r = await decideFix(id, d);
      setError(r.error);
      if (!r.error) router.refresh();
    });
  return (
    <span className="seo-actions">
      {status === "waiting" && (
        <button type="button" className="adm-btn is-primary" disabled={pending} onClick={() => act("approve")}>
          Approve
        </button>
      )}
      {status === "failed" && (
        <button type="button" className="adm-btn" disabled={pending} onClick={() => act("retry")}>
          Retry
        </button>
      )}
      {["auto", "waiting", "queued", "failed"].includes(status) && (
        <button type="button" className="adm-link-btn" disabled={pending} onClick={() => act("dismiss")}>
          Dismiss
        </button>
      )}
      {error && <small className="adm-error">{error}</small>}
    </span>
  );
};

/** Approve (→ backlog topic for the blog autopilot) or dismiss a keyword idea. */
export const KeywordButtons = ({ keyword }: { keyword: string }) => {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const act = (d: "approve" | "dismiss") =>
    start(async () => {
      const r = await decideKeyword(keyword, d);
      setError(r.error);
      if (!r.error) router.refresh();
    });
  return (
    <span className="seo-actions">
      <button type="button" className="adm-btn is-primary" disabled={pending} onClick={() => act("approve")} title="Adds it to content/backlog.json through the SEO autopilot">
        Add to backlog
      </button>
      <button type="button" className="adm-link-btn" disabled={pending} onClick={() => act("dismiss")}>
        Dismiss
      </button>
      {error && <small className="adm-error">{error}</small>}
    </span>
  );
};

/** Runs the sync now (what's due + a fresh analysis), up to about 45 seconds. */
export const SyncButton = () => {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="seo-actions">
      <button
        type="button"
        className="adm-btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await syncNow();
            setMessage(r.error ?? Object.entries(r.result ?? {}).map(([k, v]) => `${k}: ${typeof v === "string" ? v : "done"}`).join(" · "));
            router.refresh();
          })
        }
      >
        {pending ? "Syncing… (up to 45 s)" : "Sync now"}
      </button>
      {message && <small className="adm-muted seo-sync-msg">{message}</small>}
    </span>
  );
};
