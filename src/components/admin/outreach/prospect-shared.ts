// Client-safe pieces shared by the prospect list, its side panel and the WhatsApp queue.
import { whatsappText } from "@/lib/outreach/whatsapp";
import type { ProspectStatus } from "@/lib/admin/labels";
import { BUSINESS_TYPES } from "@/lib/outreach/osm-types";
export type ProspectRow = {
  id: string;
  name: string;
  business_type: string;
  city: string | null;
  country: string;
  timezone: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  email_source: string | null;
  status: ProspectStatus;
  skip_reason: string | null;
  audit_score: number | null;
  lead_score: number | null;
  notes: string | null;
  lead_id: string | null;
  last_contacted_at: string | null;
  created_at: string;
  audits: { report_id: string; score: number | null; final_url: string | null; created_at: string; expires_at: string }[];
};

export const typeLabel = (t: string) => BUSINESS_TYPES[t as keyof typeof BUSINESS_TYPES]?.label ?? t;
export const latestAudit = (p: ProspectRow) => [...(p.audits ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;

/** The shared prefilled WhatsApp message for this prospect (Hamza sends it himself). */
export const messageFor = (p: ProspectRow) => {
  const a = latestAudit(p);
  return whatsappText({ name: p.name, website: a?.final_url ?? null, reportId: a?.report_id ?? null, reportExpires: a?.expires_at ?? null });
};
