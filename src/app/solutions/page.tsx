import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import Section from "@/components/site/ds/Section";
import Icon from "@/components/site/ds/Icon";
import WhereIWork from "@/components/site/WhereIWork";
import { getSolutions } from "@/lib/solutions";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import "@/components/styles/Tools.css";

export const metadata: Metadata = {
  title: "Web Development Solutions by Industry",
  description:
    "Websites, dashboards and AI chatbots planned around your industry: ecommerce brands, restaurants, clinics, real estate, SaaS startups and agencies worldwide.",
  alternates: { canonical: "/solutions" },
};

export default function SolutionsPage() {
  const solutions = getSolutions();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Solutions", item: `${SITE.url}/solutions` },
        ],
      },
      {
        "@type": "ItemList",
        itemListElement: solutions.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE.url}/solutions/${s.slug}`, name: s.title })),
      },
    ],
  };

  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="x-hero x-hero-center">
        <span className="x-label">Solutions</span>
        <h1 className="x-h1">
          Built around <span>your industry</span>
        </h1>
        <p className="x-hero-lead">
          A clinic needs bookings, a store needs checkout, an agency needs a reliable partner. Pick your industry to see the problems I&apos;d solve
          first and what I&apos;d build.
        </p>
        <WhereIWork className="is-center" />
      </section>

      <Section label="Industries" title="Choose your industry">
        <div className="x-grid-4 sol-grid">
          {solutions.map((s) => (
            <Link key={s.slug} href={`/solutions/${s.slug}`} className="x-card" data-reveal>
              <span className="x-card-icon">
                <Icon name={s.icon} />
              </span>
              <h2 className="sol-card-title">{s.industry}</h2>
              <p>{s.lead}</p>
              <span className="x-link">
                See the plan <Icon name="arrow" size={16} />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section label="Not listed?" title="Every project starts the same way">
        <div className="tool-prose" data-reveal>
          <p>
            If your industry isn&apos;t here, the process is the same: a free call about your customers and goals, a written quote, then weekly
            previews until launch. See all <Link href="/services">services and prices</Link>, estimate your project with the{" "}
            <Link href="/tools/website-cost-calculator">website cost calculator</Link>, or check your current site with the{" "}
            <Link href="/tools/free-seo-audit">free SEO audit tool</Link>.
          </p>
        </div>
      </Section>
    </SiteShell>
  );
}
