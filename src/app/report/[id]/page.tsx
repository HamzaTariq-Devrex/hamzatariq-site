import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import { ScoreRing } from "@/components/tools/AuditReportView";
import { SEO_AUDIT_TOOL } from "@/data/tools";
import { IMAGE_BASE } from "@/data/projects";
import { ox } from "@/lib/outreach/db";
import { relatedProject } from "@/lib/outreach/compose";
import { findings } from "@/lib/outreach/problems";
import { nounFor, takesBookings } from "@/lib/outreach/osm-types";
import { formatDate } from "@/lib/admin/labels";
import "@/components/styles/Audit.css";

// Free report linked from outreach follow-ups. Private: noindex, not in the sitemap, an unguessable
// id, and it expires 60 days after the audit. Plain words only: what each problem costs and the fix.
export const dynamic = "force-dynamic";

const ID = /^[a-f0-9]{24}$/;
const load = async (id: string) => (ID.test(id) ? ox.report(id).catch(() => null) : null);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = await load(id);
  return {
    title: r ? `Website check for ${r.name}` : "Website check",
    description: "A free, plain-English check of your website by Hamza Tariq: what's costing you customers and how to fix it.",
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
          <span className="x-label">Free website check</span>
          <h1 className="x-h1">
            This report has <span>expired</span>
          </h1>
          <p className="x-hero-lead">Reports are kept for 60 days. You can run a fresh check of {r.name}&apos;s website any time with the free website checker.</p>
          <div className="x-actions is-center">
            <Link href={SEO_AUDIT_TOOL.href} className="page-btn page-btn-primary">
              Check a website for free
            </Link>
            <BookCall variant="ghost" label="Message me on WhatsApp" />
          </div>
        </section>
      </SiteShell>
    );
  }

  const result = r.result;
  const top = findings(result, { noun: nounFor(r.business_type), city: r.city, bookings: takesBookings(r.business_type) }).slice(0, 3);
  const project = relatedProject(r.business_type);
  const shot = result?.pagespeed?.screenshot;

  return (
    <SiteShell
      cta={{
        title: (
          <>
            Want these <span>fixed</span>?
          </>
        ),
        text: "Message me on WhatsApp. I'll tell you what I'd fix first, how long it takes and what it costs. No obligation.",
      }}
    >
      <section className="x-hero x-hero-center audit-hero">
        <span className="x-label">Free website check</span>
        <h1 className="x-h1">
          {r.name}: <span>{result ? "what to fix first" : "website ideas"}</span>
        </h1>
        <p className="x-hero-lead">
          Prepared for {r.name}
          {r.city ? `, ${r.city}` : ""} by Hamza Tariq on {formatDate(r.created_at, false)}. Private link, available until {formatDate(r.expires_at, false)}.
        </p>
        <div className="x-actions is-center">
          <BookCall label="Message me on WhatsApp" />
        </div>
      </section>

      <div className="audit report-page">
        <div className="audit-result">
          {result ? (
            <div className="audit-summary x-card">
              <ScoreRing score={result.score} />
              <div>
                <p className="audit-host">{new URL(result.finalUrl).hostname}</p>
                <h2>{result.score >= 90 ? "Your website is in good shape." : result.score >= 50 ? "A good start, with a few things holding you back." : "Your website is losing you customers."}</h2>
                <p>Your score out of 100 for how easily people can find you on Google and get in touch on a phone. These are the {top.length} things I&apos;d fix first.</p>
              </div>
            </div>
          ) : (
            <div className="audit-summary x-card">
              <div>
                <h2>I couldn&apos;t find a website for {r.name}.</h2>
                <p>If you already have one, send me the address on WhatsApp and I&apos;ll check it for free.</p>
              </div>
            </div>
          )}

          <section className="audit-group">
            <h2>{top.length > 1 ? `The ${top.length} things I'd fix first` : "What I'd fix first"}</h2>
            <ul>
              {top.map((f, i) => (
                <li key={f.id} className={`audit-check ${i === 0 ? "is-fail" : "is-warn"}`}>
                  <span className="audit-pill">{i + 1}</span>
                  <div>
                    <h3>{f.title}</h3>
                    <p>What it costs you: {f.cost.charAt(0).toUpperCase() + f.cost.slice(1)}.</p>
                    <p className="audit-fix">
                      <strong>The fix:</strong> {f.fix}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {shot && (
            <section className="audit-group report-shot">
              <h2>Your homepage on a phone</h2>
              <p className="audit-hint">How the page looked when Google tested it on a mobile phone.</p>
              {/* A small data URI captured by Google's own test; next/image can't optimise data URIs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot} alt={`${r.name} homepage on a mobile phone`} width={280} loading="lazy" />
            </section>
          )}

          <section className="audit-group report-project">
            <h2>A recent project</h2>
            <Link href={`/work/${project.slug}`} className="report-project-card x-card">
              <Image src={`${IMAGE_BASE}${project.mobileImage ?? project.image}`} alt={`${project.title} website on a phone`} width={160} height={320} sizes="160px" />
              <span>
                <strong>{project.title}</strong>
                <small>{project.label} · Built at Devrex Digital</small>
                <span>{project.description}</span>
              </span>
            </Link>
          </section>

          <div className="audit-next">
            <div className="audit-cta x-card">
              <h2>Talk it through</h2>
              <p>I&apos;m Hamza Tariq, founder of Devrex Digital. Message me and I&apos;ll explain the fixes in plain words.</p>
              <div className="x-actions">
                <BookCall label="Message me on WhatsApp" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
