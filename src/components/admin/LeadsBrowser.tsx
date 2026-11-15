"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { SITE } from "@/lib/site";
import type { Database } from "@/lib/supabase/database.types";
import { SERVICE_GROUPS, SOURCES, SOURCE_LABELS, STATUSES, STATUS_LABELS, formatDate, pktDay, serviceLabel } from "@/lib/admin/labels";
import { exportLeads, getLead, listLeads, type LeadFilters } from "@/app/admin/(dashboard)/actions";
import { EmptyState, StatusBadge } from "./ui";

// The side panel (and its transcript) loads only when a lead is opened.
const LeadPanel = dynamic(() => import("./LeadPanel"));

export type Lead = Database["public"]["Tables"]["leads"]["Row"] & {
  /** The SEO audit an "seo-audit" lead asked for. */
  audit?: { final_url: string | null; score: number } | null;
};
/** The columns the table shows. */
export type LeadRow = Pick<Lead, "id" | "name" | "email" | "project_type" | "budget" | "source" | "status" | "created_at"> & { audit?: Lead["audit"] };

const csvCell = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;

const toCsv = (rows: Lead[]) => {
  const head = ["Date", "Name", "Email", "WhatsApp", "Service", "Project type", "Budget", "Source", "Audited URL", "SEO score", "Status", "Page", "Message", "Notes"];
  const lines = rows.map((l) =>
    [
      formatDate(l.created_at),
      l.name,
      l.email,
      l.phone,
      serviceLabel(l.project_type),
      l.project_type,
      l.budget,
      SOURCE_LABELS[l.source] ?? l.source,
      l.audit?.final_url ?? "",
      l.audit ? String(l.audit.score) : "",
      STATUS_LABELS[l.status as keyof typeof STATUS_LABELS] ?? l.status,
      l.page ? `${SITE.url}${l.page}` : "",
      l.message,
      l.notes,
    ]
      .map(csvCell)
      .join(","),
  );
  return [head.map(csvCell).join(","), ...lines].join("\r\n");
};

const EMPTY: LeadFilters = { q: "", status: "", service: "", source: "", from: "", to: "", newestFirst: true };

/** Leads, 50 per page; filters and search run in Postgres. */
const LeadsBrowser = ({ initial, initialLeadId }: { initial: { rows: LeadRow[]; total: number }; initialLeadId: string | null }) => {
  const [filters, setFilters] = useState<LeadFilters>(EMPTY);
  const [rows, setRows] = useState(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [error, setError] = useState("");
  const [loading, start] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialLeadId);
  const [selected, setSelected] = useState<Lead | null>(null);
  const first = useRef(true);
  const set = (patch: Partial<LeadFilters>) => setFilters((f) => ({ ...f, ...patch }));

  // Reload page 1 when a filter changes (search waits for a short pause in typing).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(
      () =>
        start(async () => {
          const res = await listLeads(filters, 0);
          setError(res.error ?? "");
          setRows(res.rows);
          setTotal(res.total);
        }),
      300,
    );
    return () => clearTimeout(t);
  }, [filters]);

  const loadMore = () =>
    start(async () => {
      const res = await listLeads(filters, rows.length);
      setError(res.error ?? "");
      setRows((r) => [...r, ...res.rows.filter((x) => !r.some((y) => y.id === x.id))]);
      setTotal(res.total);
    });

  // Keep ?lead= in the address bar so a lead can be linked (e.g. from the notification email),
  // and load the full lead for the panel only when one is opened.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("lead", selectedId);
    else url.searchParams.delete("lead");
    window.history.replaceState(null, "", url);
    setSelected(null);
    if (selectedId) getLead(selectedId).then(setSelected);
  }, [selectedId]);

  const filtersOn = !!(filters.q || filters.status || filters.service || filters.source || filters.from || filters.to);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await exportLeads(filters);
      // BOM so Excel reads names with accents correctly.
      const blob = new Blob(["﻿" + toCsv(all)], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `leads-${pktDay(new Date())}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  };

  if (!initial.total && !filtersOn) {
    return (
      <div className="adm-card">
        <EmptyState icon="leads" title="No leads yet" text="When someone sends their details through the chat or the contact form, they'll show up here with their message and chat.">
          <a href="/contact" className="adm-btn" target="_blank" rel="noreferrer">
            Open the contact page
          </a>
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <div className="adm-toolbar">
        <label className="adm-search">
          <span className="sr-only">Search leads</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" />
          </svg>
          <input type="search" placeholder="Search name, email, message or notes" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
        </label>
        <div className="adm-filters">
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select value={filters.service} onChange={(e) => set({ service: e.target.value })} aria-label="Filter by service">
            <option value="">All services</option>
            {SERVICE_GROUPS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={filters.source} onChange={(e) => set({ source: e.target.value })} aria-label="Filter by source">
            <option value="">All sources</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          <label className="adm-date">
            <span>From</span>
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className="adm-date">
            <span>To</span>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} />
          </label>
        </div>
        <div className="adm-toolbar-end">
          <span className="adm-count" aria-live="polite">
            {loading ? "Loading…" : `${rows.length} of ${total}`}
          </span>
          {filtersOn && (
            <button type="button" className="adm-link-btn" onClick={() => setFilters(EMPTY)}>
              Clear filters
            </button>
          )}
          <button type="button" className="adm-btn" onClick={exportCsv} disabled={!total || exporting}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}

      {rows.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Service</th>
                <th scope="col">Budget</th>
                <th scope="col">Source</th>
                <th scope="col">Status</th>
                <th scope="col" aria-sort={filters.newestFirst ? "descending" : "ascending"}>
                  <button type="button" className="adm-sort" onClick={() => set({ newestFirst: !filters.newestFirst })}>
                    Date <span aria-hidden="true">{filters.newestFirst ? "↓" : "↑"}</span>
                    <span className="sr-only">{filters.newestFirst ? "newest first, click for oldest first" : "oldest first, click for newest first"}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className={l.id === selectedId ? "is-selected" : ""} onClick={() => setSelectedId(l.id)}>
                  <td data-label="Name">
                    <button type="button" className="adm-row-btn" onClick={() => setSelectedId(l.id)}>
                      {l.name}
                    </button>
                  </td>
                  <td data-label="Email" className="adm-muted">
                    {l.email}
                  </td>
                  <td data-label="Service">{serviceLabel(l.project_type)}</td>
                  <td data-label="Budget" className={`adm-muted${l.budget ? "" : " is-empty"}`}>
                    {l.budget ?? "-"}
                  </td>
                  <td data-label="Source">
                    {SOURCE_LABELS[l.source] ?? l.source}
                    {l.audit && (
                      <span className="adm-muted adm-audit-cell">
                        {l.audit.final_url ? new URL(l.audit.final_url).hostname : ""} · {l.audit.score}/100
                      </span>
                    )}
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={l.status} />
                  </td>
                  <td data-label="Date" className="adm-muted adm-nowrap">
                    {formatDate(l.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length < total && (
            <div className="adm-more">
              <button type="button" className="adm-btn" onClick={loadMore} disabled={loading}>
                {loading ? "Loading…" : `Load more (${total - rows.length} left)`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="adm-card">
          <EmptyState icon="search" title={loading ? "Loading…" : "No leads match"} text="Try another search or remove a filter.">
            <button type="button" className="adm-btn" onClick={() => setFilters(EMPTY)}>
              Clear filters
            </button>
          </EmptyState>
        </div>
      )}

      {selectedId && selected && <LeadPanel key={selected.id} lead={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
};

export default LeadsBrowser;
