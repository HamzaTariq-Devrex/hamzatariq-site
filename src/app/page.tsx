import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
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
      knowsAbout: ["React", "Next.js", "TypeScript", "Tailwind CSS", "GSAP", "Ecommerce websites", "Dashboards", "AI chatbots", "Technical SEO"],
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <HomeClient />
    </>
  );
}
