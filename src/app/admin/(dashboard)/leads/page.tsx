import type { Metadata } from "next";
import { getOwner } from "@/lib/supabase/server";
import LeadsBrowser from "@/components/admin/LeadsBrowser";
import { PageHead } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const { supabase } = (await getOwner())!; // the layout redirects when signed out
  const [{ lead }, { data, error }] = await Promise.all([
    searchParams,
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5000),
  ]);

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
