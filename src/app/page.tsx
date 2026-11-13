import type { Metadata } from "next";
import Image from "next/image";
import SiteShell from "@/components/site/SiteShell";
import CvLink from "@/components/site/CvLink";
import HeroCtas from "@/components/home/HeroCtas";
import Aurora from "@/components/home/Aurora";
import HomeReviews from "@/components/HomeReviews";
import { ClientWordmarks, FreeTools, HowIWork, LatestPosts, SelectedWork, ServicesBento, Statement } from "@/components/home/HomeSections";
import VelocityBand from "@/components/ui/VelocityBand";
import WordRotate from "@/components/ui/WordRotate";
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

      <section className="hero" data-motion="none">
        {/* Live aurora (WebGL shader) over a CSS gradient; full width, behind the header too. */}
        <div className="hero-bg" aria-hidden="true">
          <Aurora />
        </div>

        <div className="hero-top">
          <p className="hero-badge">
            <span className="page-status" aria-hidden="true" /> Available for new projects
          </p>
          <p className="hero-place">{SITE.location}</p>
        </div>

        {/* Magic UI Word Rotate: the first word is in the server HTML; all three are in the accessible text. */}
        <h1 className="hero-title">
          <span className="hero-line is-1">
            I build <WordRotate words={["websites", "dashboards", "AI chatbots"]} className="hero-rotate" />
          </span>{" "}
          <span className="hero-line is-2">that bring businesses</span>{" "}
          <span className="hero-line is-3">
            <em>customers.</em>
          </span>
        </h1>

        <div className="hero-bottom">
          <div className="hero-intro">
            <div className="hero-who">
              <span className="hero-photo">
                <Image src={SITE.photo.src} alt={SITE.photo.alt} width={SITE.photo.width} height={SITE.photo.height} sizes="48px" />
              </span>
              <span className="hero-who-text">
                <strong>{SITE.name}</strong>
                <span>{SITE.role}</span>
              </span>
            </div>
            <p className="hero-lead">
              Custom-coded in Next.js and ready for Google from day one. Based in Pakistan, working with clients worldwide.
            </p>
          </div>
          <div className="hero-actions">
            <HeroCtas />
            <p className="hero-meta">
              <CvLink href={SITE.cvUrl ?? "/hire"} className="hero-cv" from="home" />
            </p>
          </div>
        </div>

        <div className="hero-scroll" aria-hidden="true">
          <span className="hero-scroll-cue">Scroll</span>
          <i />
        </div>
      </section>

      <VelocityBand top={["Websites", "Dashboards", "AI chatbots", "React SEO"]} bottom={["Custom code", "No templates", "Fast pages", "Ready for Google"]} />

      <ClientWordmarks />
      <Statement />
      <ServicesBento />
      <SelectedWork />
      <HomeReviews />
      <HowIWork />
      <FreeTools />
      <LatestPosts />
    </SiteShell>
  );
}
