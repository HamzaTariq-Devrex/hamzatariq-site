"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { PROSPECT_STATUSES, PROSPECT_STATUS_LABELS, formatDate, type ProspectStatus } from "@/lib/admin/labels";
import { listProspects } from "@/app/admin/(dashboard)/prospects/actions";
import { EmptyState } from "../ui";
import { typeLabel, type ProspectRow } from "./prospect-shared";

export type { ProspectRow } from "./prospect-shared";

// The side panel (and the email thread it loads) is fetched only when a prospect is opened.
const ProspectPanel = dynamic(() => import("./ProspectPanel"));

type Props = { initial: ProspectRow[]; total: number; counts: Record<string, number>; initialId: string | null };

/** Prospects, 50 per page, best leads first; status filter and search run in Postgres. */
const ProspectsBrowser = ({ initial, total: initialTotal, counts, initialId }: Props) => {
  const [filter, setFilter] = useState<"all" | ProspectStatus>("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const [openId, setOpenId] = useState<string | null>(initialId);
  const [opened, setOpened] = useState<ProspectRow | null>(null);
  const [loading, start] = useTransition();
  const first = useRef(true);

  // Fresh server data (after an action) replaces the first page.
  useEffect(() => {
    setRows(initial);
    setTotal(initialTotal);
  }, [initial, initialTotal]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(
      () =>
        start(async () => {
          const res = await listProspects(filter, q, 0);
          setRows(res.rows);
          setTotal(res.total);
        }),
      300,
    );
    return () => clearTimeout(t);
  }, [filter, q]);

  const more = () =>
    start(async () => {
      const res = await listProspects(filter, q, rows.length);
      setRows((r) => [...r, ...res.rows.filter((x) => !r.some((y) => y.id === x.id))]);
      setTotal(res.total);
    });

  // ?p=<id> from an alert email opens that prospect even when it isn't on the first page.
  useEffect(() => {
    if (!openId) return setOpened(null);
    const row = rows.find((p) => p.id === openId);
    if (row) setOpened(row);
    else listProspects("all", "", 0, openId).then((res) => setOpened(res.rows[0] ?? null));
  }, [openId, rows]);

  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>
          Prospects <span className="adm-count">{counts.all ?? total}</span>
        </h2>
      </div>
      <div className="adm-toolbar">
        <input className="adm-search" type="search" placeholder="Search name, city, email or website" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search prospects" />
        <select className="ox-filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {PROSPECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROSPECT_STATUS_LABELS[s]} ({counts[s] ?? 0})
            </option>
          ))}
        </select>
        <span className="adm-count" aria-live="polite">
          {loading ? "Loading…" : `${rows.length} of ${total}`}
        </span>
      </div>
      {rows.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Business</th>
                <th scope="col">Email</th>
                <th scope="col">Audit</th>
                <th scope="col">Lead</th>
                <th scope="col">Status</th>
                <th scope="col">Found</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button type="button" className="adm-row-btn ox-row" onClick={() => setOpenId(p.id)}>
                      <strong>{p.name}</strong>
                      <span className="adm-muted">
                        {typeLabel(p.business_type)}
                        {p.city ? `, ${p.city}` : ""}
                        {p.website ? ` · ${p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}` : " · no website"}
                      </span>
                    </button>
                  </td>
                  <td className="adm-nowrap">{p.email ?? <span className="adm-muted">-</span>}</td>
                  <td>{p.audit_score ?? "-"}</td>
                  <td>{p.lead_score ?? "-"}</td>
                  <td>
                    <span className={`adm-badge ox-status is-${p.status}`} title={p.skip_reason ?? undefined}>
                      {PROSPECT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="adm-nowrap adm-muted">{formatDate(p.created_at, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length < total && (
            <div className="adm-more">
              <button type="button" className="adm-btn" onClick={more} disabled={loading}>
                {loading ? "Loading…" : `Load more (${total - rows.length} left)`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState icon="search" title={loading ? "Loading…" : "No prospects here"} text="Add a saved search and run it, or change the filter." compact />
      )}
      {opened && <ProspectPanel key={opened.id} p={opened} onClose={() => setOpenId(null)} />}
    </section>
  );
};

export default ProspectsBrowser;
