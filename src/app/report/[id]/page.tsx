import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import { AuditGroups, ScoreRing } from "@/components/tools/AuditReportView";
import { SEO_AUDIT_TOOL } from "@/data/tools";
import { ox } from "@/lib/outreach/db";
import { topProblems } from "@/lib/outreach/compose";
import { BUSINESS_TYPES, isBusinessType } from "@/lib/outreach/osm";
import { formatDate } from "@/lib/admin/labels";
import "@/components/styles/Audit.css";

// Free report linked from an outreach email. Private: noindex, not in the sitemap, an unguessable
// id, and it expires 30 days after the audit.
export const dynamic = "force-dynamic";

const ID = /^[a-f0-9]{24}$/;

const load = async (id: string) => (ID.test(id) ? ox.report(id).catch(() => null) : null);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = await load(id);
  return {
    title: r ? `Free website report for ${r.name}` : "Website report",
    description: "A free SEO and speed check of your website by Hamza Tariq, with what to fix first.",
    robots: { index: false, follow: false, nocache: true },
    alternates: { canonical: `/report/${id}` },
  };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await load(id);
  if (!r) notFound();

  if (r.expired) {
    return (
      <SiteShell>
        <section className="x-hero x-hero-center audit-hero">
          <span className="x-label">Free website report</span>
          <h1 className="x-h1">
            This report has <span>expired</span>
          </h1>
          <p className="x-hero-lead">Reports are kept for 30 days. You can run a fresh check of {r.name}&apos;s website any time with the free SEO audit tool.</p>
          <div className="x-actions is-center">
            <Link href={SEO_AUDIT_TOOL.href} className="page-btn page-btn-primary">
              Run a free audit
            </Link>
            <BookCall variant="ghost" />
          </div>
        </section>
      </SiteShell>
    );
  }

  const result = r.result;
  const kind = isBusinessType(r.business_type) ? BUSINESS_TYPES[r.business_type].label.toLowerCase() : "business";
  const toFix = result ? result.checks.filter((c) => c.status === "fail" || c.status === "warn").length : 0;
  const first = topProblems(result, 2);

  return (
    <SiteShell
      cta={{
        title: (
          <>
            Want these <span>fixed</span>?
          </>
        ),
        text: "Message me on WhatsApp. I'll tell you what I'd fix first, how long it takes and what it costs, with no obligation.",
      }}
    >
      <section className="x-hero x-hero-center audit-hero">
        <span className="x-label">Free website report</span>
        <h1 className="x-h1">
          {r.name}: <span>{result ? "SEO check" : "website ideas"}</span>
        </h1>
        <p className="x-hero-lead">
          Prepared for {r.name}
          {r.city ? `, ${r.city}` : ""} by Hamza Tariq on {formatDate(r.created_at, false)}. This page is private and expires on {formatDate(r.expires_at, false)}.
        </p>
        <div className="x-actions is-center">
          <BookCall />
        </div>
      </section>

      <div className="audit report-page">
        {result ? (
          <div className="audit-result">
            <div className="audit-summary x-card">
              <ScoreRing score={result.score} />
              <div>
                <p className="audit-host">{new URL(result.finalUrl).hostname}</p>
                <h2>{result.score >= 90 ? "Strong technical SEO." : result.score >= 50 ? "A good base, with things to fix." : "Search engines are struggling with this page."}</h2>
                <p>{toFix ? `${toFix} thing${toFix > 1 ? "s" : ""} to fix or improve, most important first.` : "No problems found on this page."}</p>
              </div>
            </div>

            {first.length > 0 && (
              <section className="audit-group">
                <h2>What I&apos;d fix first</h2>
                <ul>
                  {first.map((c) => (
                    <li key={c.id} className={`audit-check is-${c.status}`}>
                      <span className="audit-pill">{c.status === "fail" ? "Fix" : "Improve"}</span>
                      <div>
                        <h3>{c.label}</h3>
                        <p>{c.detail}</p>
                        {c.fix && (
                          <p className="audit-fix">
                            <strong>How to fix:</strong> {c.fix}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <AuditGroups result={result} />
            <p className="audit-hint">
              Checked the home page the way a search engine crawler reads it, without running JavaScript, plus Google PageSpeed on mobile when it answered in time. Run it again any time with the{" "}
              <Link href={`${SEO_AUDIT_TOOL.href}?url=${encodeURIComponent(result.finalUrl)}`}>free SEO audit tool</Link>.
            </p>
          </div>
        ) : (
          <div className="audit-result">
            <div className="audit-summary x-card">
              <div>
                <h2>I couldn&apos;t find a website listed for {r.name}.</h2>
                <p>
                  Your {kind} is listed on OpenStreetMap, but no website is linked there. If you already have one, I&apos;m happy to check it for free: send me the address on WhatsApp.
                </p>
                <p>
                  If you don&apos;t, a fast, simple site helps people who search for you on Google find your opening hours, location and contact details and get in touch. See what&apos;s included in my{" "}
                  <Link href="/services/nextjs-websites">Next.js website service</Link>.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="audit-next">
          <div className="audit-cta x-card">
            <h2>Talk it through</h2>
            <p>I&apos;m Hamza Tariq, a web developer and founder of Devrex Digital. Message me and I&apos;ll explain the fixes in plain words.</p>
            <div className="x-actions">
              <BookCall />
              <Link href="/services/react-nextjs-seo" className="page-btn page-btn-ghost">
                See the SEO service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
