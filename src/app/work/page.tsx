import type { Metadata } from "next";
import SiteShell from "@/components/site/SiteShell";
import WorkBrowser from "@/components/site/WorkBrowser";
import { IMAGE_BASE, PROJECTS } from "@/data/projects";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Work: 31 Custom Websites and Online Stores",
  description:
    "31 custom websites and online stores built at Devrex Digital for fashion, jewellery, home decor, beauty, travel and B2B brands in Pakistan and abroad.",
  alternates: { canonical: "/work" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Work", item: `${SITE.url}/work` },
      ],
    },
    {
      "@type": "CollectionPage",
      name: "Work by Hamza Tariq",
      url: `${SITE.url}/work`,
      author: { "@id": `${SITE.url}/#person` },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: PROJECTS.length,
        itemListElement: PROJECTS.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE.url}/work/${p.slug}`,
          name: p.title,
          image: IMAGE_BASE + p.image,
        })),
      },
    },
  ],
};

export default function WorkPage() {
  return (
    <SiteShell active="work">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="page-hero">
        <span className="page-eyebrow">Portfolio</span>
        <h1>
          All <span>projects</span>
        </h1>
        <p>
          {PROJECTS.length} custom websites and online stores I&apos;ve built at Devrex Digital for brands in
          Pakistan and abroad, from fashion and jewellery to travel and B2B.
        </p>
      </section>

      <h2 className="sr-only">Projects</h2>
      <WorkBrowser />
    </SiteShell>
  );
}
