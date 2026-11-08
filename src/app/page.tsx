import type { Metadata } from "next";
import Image from "next/image";
import SiteShell from "@/components/site/SiteShell";
import CvLink from "@/components/site/CvLink";
import HeroCtas from "@/components/home/HeroCtas";
import HeroDemo from "@/components/home/HeroDemo";
import HomeReviews from "@/components/HomeReviews";
import LogoStrip from "@/components/home/LogoStrip";
import { FreeTools, HowIWork, LatestPosts, SelectedWork, ServicesBento } from "@/components/home/HomeSections";
import "@/components/styles/Blog.css";
import "@/components/styles/Home.css";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import { SERVICES } from "@/data/services";
import { UNIVERSITY } from "@/data/experience";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE.url}/#person`,
      name: SITE.name,
      url: SITE.url,
      jobTitle: "Founder",
      description: SITE.bio,
      image: `${SITE.url}${SITE.photo.src}`,
      email: `mailto:${SITE.email}`,
      sameAs: [SITE.social.github, SITE.social.instagram],
      worksFor: { "@type": "Organization", name: SITE.agency.name, url: SITE.agency.url },
      alumniOf: { "@type": "CollegeOrUniversity", name: UNIVERSITY.name, url: UNIVERSITY.url },
      address: { "@type": "PostalAddress", ...SITE.address },
      knowsAbout: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Ecommerce websites", "Dashboards", "AI chatbots", "Technical SEO"],
    },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE.url}/#service`,
      name: `${SITE.name}, Web Developer`,
      url: SITE.url,
      email: SITE.email,
      image: SITE.logo,
      founder: { "@id": `${SITE.url}/#person` },
      description: SITE.positioning,
      serviceType: SERVICES.map((s) => s.keyword),
      areaServed: "Worldwide",
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Services",
        itemListElement: SERVICES.map((s) => ({
          "@type": "Offer",
          itemOffered: { "@id": `${SITE.url}/services/${s.slug}#service` },
        })),
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      name: SITE.name,
      url: SITE.url,
      publisher: { "@id": `${SITE.url}/#person` },
      inLanguage: "en",
    },
  ],
};

export default function HomePage() {
  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />

      <section className="hero">
        <div className="hero-text">
          <div className="hero-who">
            <span className="hero-photo">
              <Image src={SITE.photo.src} alt={SITE.photo.alt} width={SITE.photo.width} height={SITE.photo.height} sizes="64px" />
            </span>
            <span className="hero-who-text">
              <strong>{SITE.name}</strong>
              <span>{SITE.role}</span>
            </span>
            <span className="hero-badge">
              <span className="page-status" aria-hidden="true" /> Available for new projects
            </span>
          </div>
          <h1 className="hero-title">
            I build <span>fast, custom</span> websites, dashboards and AI chatbots for businesses worldwide.
          </h1>
          <p className="hero-lead">
            Custom-coded in Next.js, ready for Google from day one and built to turn visitors into customers. With my team at{" "}
            {SITE.agency.name} I&apos;ve delivered for 45+ brands.
          </p>
          <HeroCtas />
          <p className="hero-meta">
            <span>{SITE.location}</span>
            <CvLink href={SITE.cvUrl ?? "/hire"} className="hero-cv" from="home" />
          </p>
        </div>
        <div className="hero-demo">
          <HeroDemo />
        </div>
      </section>

      <LogoStrip />
      <ServicesBento />
      <SelectedWork />
      <HomeReviews />
      <HowIWork />
      <FreeTools />
      <LatestPosts />
    </SiteShell>
  );
}
