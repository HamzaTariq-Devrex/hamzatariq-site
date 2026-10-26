"use client";

import { useEffect, useMemo, useState } from "react";
import { SITE } from "@/lib/site";
import type { Database } from "@/lib/supabase/database.types";
import {
  SERVICE_GROUPS,
  SOURCES,
  SOURCE_LABELS,
  STATUSES,
  STATUS_LABELS,
  formatDate,
  pktDay,
  serviceLabel,
  serviceOf,
} from "@/lib/admin/labels";
import { EmptyState, StatusBadge } from "./ui";
import LeadPanel from "./LeadPanel";

export type Lead = Database["public"]["Tables"]["leads"]["Row"];

const csvCell = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;

const toCsv = (rows: Lead[]) => {
  const head = ["Date", "Name", "Email", "WhatsApp", "Service", "Project type", "Budget", "Source", "Status", "Page", "Message", "Notes"];
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

const LeadsBrowser = ({ leads, initialLeadId }: { leads: Lead[]; initialLeadId: string | null }) => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(initialLeadId);

  // Keep ?lead= in the address bar so a lead can be linked (e.g. from the notification email).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("lead", selectedId);
    else url.searchParams.delete("lead");
    window.history.replaceState(null, "", url);
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = leads.filter((l) => {
      if (status && l.status !== status) return false;
      if (service && serviceOf(l.project_type) !== service) return false;
      if (source && l.source !== source) return false;
      const day = pktDay(l.created_at);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!q) return true;
      return [l.name, l.email, l.phone, l.message, l.notes, l.project_type].some((v) => v?.toLowerCase().includes(q));
    });
    return newestFirst ? rows : [...rows].reverse();
  }, [leads, query, status, service, source, from, to, newestFirst]);

  const filtersOn = !!(query || status || service || source || from || to);
  const clear = () => {
    setQuery("");
    setStatus("");
    setService("");
    setSource("");
    setFrom("");
    setTo("");
  };

  const exportCsv = () => {
    // BOM so Excel reads names with accents correctly.
    const blob = new Blob(["﻿" + toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${pktDay(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  if (!leads.length) {
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
          <input type="search" placeholder="Search name, email, message or notes" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="adm-filters">
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select value={service} onChange={(e) => setService(e.target.value)} aria-label="Filter by service">
            <option value="">All services</option>
            {SERVICE_GROUPS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source">
            <option value="">All sources</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          <label className="adm-date">
            <span>From</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="adm-date">
            <span>To</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="adm-toolbar-end">
          <span className="adm-count">
            {filtered.length} of {leads.length}
          </span>
          {filtersOn && (
            <button type="button" className="adm-link-btn" onClick={clear}>
              Clear filters
            </button>
          )}
          <button type="button" className="adm-btn" onClick={exportCsv} disabled={!filtered.length}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {filtered.length ? (
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
                <th scope="col" aria-sort={newestFirst ? "descending" : "ascending"}>
                  <button type="button" className="adm-sort" onClick={() => setNewestFirst((v) => !v)}>
                    Date <span aria-hidden="true">{newestFirst ? "↓" : "↑"}</span>
                    <span className="sr-only">{newestFirst ? "newest first, click for oldest first" : "oldest first, click for newest first"}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
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
                  <td data-label="Source">{SOURCE_LABELS[l.source] ?? l.source}</td>
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
        </div>
      ) : (
        <div className="adm-card">
          <EmptyState icon="search" title="No leads match" text="Try another search or remove a filter.">
            <button type="button" className="adm-btn" onClick={clear}>
              Clear filters
            </button>
          </EmptyState>
        </div>
      )}

      {selected && <LeadPanel key={selected.id} lead={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
};

export default LeadsBrowser;
