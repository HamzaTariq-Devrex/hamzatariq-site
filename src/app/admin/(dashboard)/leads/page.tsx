import type { Metadata } from "next";
import { Suspense } from "react";
import LeadsBrowser from "@/components/admin/LeadsBrowser";
import { PageHead } from "@/components/admin/ui";
import { SkeletonCard } from "@/components/admin/Skeleton";
import { listLeads } from "../actions";

export const metadata: Metadata = { title: "Leads" };

/** First page of leads (50 rows, list columns only); the rest loads on demand. */
async function Leads({ leadId }: { leadId: string | null }) {
  const first = await listLeads({ q: "", status: "", service: "", source: "", from: "", to: "", newestFirst: true }, 0);
  if (first.error) {
    return (
      <p className="adm-error" role="alert">
        Could not load leads: {first.error}
      </p>
    );
  }
  return <LeadsBrowser initial={first} initialLeadId={leadId} />;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const { lead } = await searchParams;
  return (
    <main className="adm-page">
      <PageHead title="Leads" text="Everyone who left their details through the chat, the contact form, a tool or an outreach reply." />
      <Suspense fallback={<SkeletonCard rows={10} title={false} />}>
        <Leads leadId={lead ?? null} />
      </Suspense>
    </main>
  );
}
