import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import Section from "@/components/site/ds/Section";
import Faq from "@/components/site/ds/Faq";
import CostCalculator from "@/components/tools/CostCalculator";
import { COST_CALCULATOR_TOOL } from "@/data/tools";
import { ADD_ONS, PROJECT_TERMS, SERVICES } from "@/data/services";
import { usd } from "@/lib/tools/cost";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import "@/components/styles/Tools.css";

export const metadata: Metadata = {
  title: "Website Cost Calculator: Price and Delivery Time",
  description:
    "Free website cost calculator: pick your site type, pages and features to see a starting price and delivery time based on real published prices. No sign-up.",
  alternates: { canonical: COST_CALCULATOR_TOOL.href },
};

// The four build services (SEO is a separate service, not part of a new build's price).
const PACKAGES = SERVICES.filter((s) => s.slug !== "react-nextjs-seo").flatMap((s) =>
  s.pricing.map((p) => ({ service: s.name, slug: s.slug, name: p.name, price: p.price, pages: p.pages ?? null, timeline: p.timeline ?? "Agreed on the call" })),
);

const FAQS = [
  {
    q: "How accurate is this website cost calculator?",
    a: "It shows the starting price of the packages your project needs, using the same prices as my service pages. The final quote comes after a short free call, because the number of pages, the content and any integrations change the work.",
  },
  {
    q: "How are extra pages, a CMS and a second language priced?",
    a: "A CMS adds $150 and a second language adds $250. Each package includes a set number of pages: up to 5 for a landing page or portfolio, up to 10 for an ecommerce store (with unlimited products) and up to 15 for a full ecommerce app. Extra pages are $50 each. Dashboards and web apps are quoted by features, not pages.",
  },
  {
    q: "Is the estimate in US dollars?",
    a: "Yes. All my prices are in USD, and I work with clients worldwide.",
  },
  {
    q: "How do I pay for a website project?",
    a: "50% upfront to start and 50% on delivery. Every project includes 2 free revision rounds and 30 days of free bug fixes after launch.",
  },
  {
    q: "Can I add an AI chatbot or SEO later?",
    a: "Yes. An AI chatbot can be added to an existing site, and SEO work (from an audit to a full React to Next.js migration) is available as a separate service.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: COST_CALCULATOR_TOOL.name, item: `${SITE.url}${COST_CALCULATOR_TOOL.href}` },
      ],
    },
    {
      "@type": "WebApplication",
      name: COST_CALCULATOR_TOOL.name,
      url: `${SITE.url}${COST_CALCULATOR_TOOL.href}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      creator: { "@id": `${SITE.url}/#person` },
    },
    { "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ],
};

export default function WebsiteCostCalculatorPage() {
  return (
    <SiteShell cta={{ title: <>Ready for an <span>exact quote</span>?</>, text: "Book a free call, tell me about your project, and you'll get a clear price and timeline afterwards." }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="x-hero x-hero-center">
        <span className="x-label">Free tool</span>
        <h1 className="x-h1">
          Website <span>cost calculator</span>
        </h1>
        <p className="x-hero-lead">
          Pick what you&apos;re building and the features you need. You&apos;ll see a starting price and delivery time straight away, based on my
          real, published prices.
        </p>
        <CostCalculator />
      </section>

      <Section
        label="How it works"
        title={
          <>
            Real packages, <span>not guesses</span>
          </>
        }
        text="This website cost calculator doesn't use industry averages. It picks the smallest of my packages that covers what you need and adds their starting prices and delivery times."
      >
        <div className="tool-prose" data-reveal>
          <p>
            Most cost calculators multiply pages by an average price. That number means little, because two five-page sites can be completely
            different projects. Instead, this tool starts from the packages I actually sell, with the prices you&apos;ll find on my{" "}
            <Link href="/services/nextjs-websites">Next.js website</Link>, <Link href="/services/dashboards">dashboard</Link> and{" "}
            <Link href="/services/ai-chatbots">AI chatbot</Link> pages.
          </p>
          <h3>How your answers change the estimate</h3>
          <ul>
            <li>
              <strong>Selling online</strong> moves you to the ecommerce store package, which already includes an admin dashboard for products and
              orders.
            </li>
            <li>
              <strong>Customer logins</strong> mean a bigger build: the full ecommerce app for stores, or a custom web app for everything else.
            </li>
            <li>
              <strong>An admin dashboard</strong> on a business website adds the custom dashboard package.
            </li>
            <li>
              <strong>An AI chatbot</strong> adds the chatbot package, trained on your own content.
            </li>
            <li>
              <strong>Content editing (CMS)</strong> adds {usd(ADD_ONS.cms.price)}, and a <strong>second language</strong> adds{" "}
              {usd(ADD_ONS.language.price)}.
            </li>
            <li>
              <strong>Bigger sites</strong> pay {usd(ADD_ONS.extraPage.price)} for each page beyond what the package includes (see the table).
              Dashboards and web apps are quoted by features, not pages.
            </li>
          </ul>
          <h3>My starting prices</h3>
          <div className="tool-table">
            <table>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>From</th>
                  <th>Pages included</th>
                  <th>Delivery</th>
                </tr>
              </thead>
              <tbody>
                {PACKAGES.map((p) => (
                  <tr key={p.name}>
                    <td>
                      <Link href={`/services/${p.slug}`}>{p.name}</Link>
                    </td>
                    <td>{usd(p.price)}</td>
                    <td>{p.pages ? `Up to ${p.pages}` : "By features"}</td>
                    <td>{p.timeline}</td>
                  </tr>
                ))}
                {Object.values(ADD_ONS).map((a) => (
                  <tr key={a.label}>
                    <td>{a.label} (add-on)</td>
                    <td>
                      +{usd(a.price)}
                      {"unit" in a ? ` ${a.unit}` : ""}
                    </td>
                    <td>-</td>
                    <td>-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Delivery times add up when your project needs more than one package, for example a store plus an AI chatbot.</p>
          <h3>What every project includes</h3>
          <ul>
            {PROJECT_TERMS.map((t) => (
              <li key={t.label}>
                <strong>{t.label}:</strong> {t.text}.
              </li>
            ))}
          </ul>
          <h3>What makes a website cost more</h3>
          <p>
            The biggest jumps come from features that need accounts and data: customer logins, order history, roles for your team, and connections
            to other systems. Design work, the amount of content and the number of page templates matter too. A ten-page site with one template can
            be quicker than a five-page site where every page is different.
          </p>
          <p>
            If you already have a React site that doesn&apos;t show up on Google, a rebuild may not be needed at all. Check it first with the{" "}
            <Link href="/tools/free-seo-audit">free SEO audit tool</Link>, or read{" "}
            <Link href="/blog/nextjs-vs-wordpress-for-business-website">Next.js vs WordPress for a business website</Link> if you&apos;re still
            choosing a platform.
          </p>
        </div>
      </Section>

      <Section label="FAQ" title={<>Questions about <span>website costs</span></>}>
        <Faq items={FAQS} />
      </Section>
    </SiteShell>
  );
}
