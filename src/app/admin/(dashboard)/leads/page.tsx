import type { Metadata } from "next";
import { getOwner } from "@/lib/supabase/server";
import LeadsBrowser, { type Lead } from "@/components/admin/LeadsBrowser";
import { PageHead } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const { supabase } = (await getOwner())!; // the layout redirects when signed out
  const query = (columns: string) => supabase.from("leads").select(columns).order("created_at", { ascending: false }).limit(5000);
  const [{ lead }, first] = await Promise.all([searchParams, query("*, audit:seo_audits(final_url, score)").overrideTypes<Lead[]>()]);
  // Before the SEO audit migration is applied the join fails; load the leads without audits.
  const { data, error } = first.error ? await query("*").overrideTypes<Lead[]>() : first;

  return (
    <main className="adm-page">
      <PageHead title="Leads" text="Everyone who left their details through the chat, the contact form or a tool." />
      {error ? (
        <p className="adm-error" role="alert">
          Could not load leads: {error.message}
        </p>
      ) : (
        <LeadsBrowser leads={data ?? []} initialLeadId={lead ?? null} />
      )}
    </main>
  );
}
