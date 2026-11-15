import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import { ox } from "@/lib/outreach/db";

// One-click unsubscribe from outreach emails. Opening the page never unsubscribes (link scanners
// open links); the single button does. The address goes on the permanent suppression list.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Stop emails from Hamza Tariq.",
  robots: { index: false, follow: false },
};

const TOKEN = /^[a-f0-9]{36}$/;

async function unsubscribe(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  if (TOKEN.test(token)) await ox.unsubscribe(token, true);
  redirect(`/unsubscribe/${token}?done=1`);
}

export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  const found = TOKEN.test(token) ? await ox.unsubscribe(token, false).catch(() => null) : null;

  return (
    <SiteShell hideCta>
      <section className="x-hero x-hero-center">
        <span className="x-label">Email preferences</span>
        {!found ? (
          <>
            <h1 className="x-h1">Link not recognised</h1>
            <p className="x-hero-lead">This unsubscribe link isn&apos;t valid. Reply to the email with &quot;unsubscribe&quot; and I&apos;ll remove you straight away.</p>
          </>
        ) : found.done || done ? (
          <>
            <h1 className="x-h1">
              You&apos;re <span>unsubscribed</span>
            </h1>
            <p className="x-hero-lead">I won&apos;t email {found.name} again. Sorry for the interruption.</p>
          </>
        ) : (
          <>
            <h1 className="x-h1">Unsubscribe {found.name}?</h1>
            <p className="x-hero-lead">One click and you won&apos;t get any more emails from me.</p>
            <form action={unsubscribe} className="x-actions is-center">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="page-btn page-btn-primary">
                Unsubscribe
              </button>
            </form>
          </>
        )}
      </section>
    </SiteShell>
  );
}
