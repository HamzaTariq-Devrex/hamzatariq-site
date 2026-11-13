import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import Section from "@/components/site/ds/Section";
import Faq from "@/components/site/ds/Faq";
import Icon from "@/components/site/ds/Icon";
import AuditTool from "@/components/tools/AuditTool";
import { SEO_AUDIT_TOOL } from "@/data/tools";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import "@/components/styles/Audit.css";

export const metadata: Metadata = {
  title: "Free SEO Audit Tool for Any Website",
  description:
    "Free SEO audit tool: check if Google can read your site, plus titles, meta tags, headings, schema, robots.txt, sitemap and mobile speed, with a fix list.",
  alternates: { canonical: SEO_AUDIT_TOOL.href },
};

const CHECKS: { icon: Parameters<typeof Icon>[0]["name"]; title: string; text: string }[] = [
  { icon: "code", title: "Server rendering", text: "Is your content in the HTML the server sends, or is it an empty shell that only fills in after JavaScript runs?" },
  { icon: "tag", title: "Title and meta description", text: "Does the page have a title and description of the right length, so Google shows them in full?" },
  { icon: "layers", title: "Headings and alt text", text: "One clear H1, a logical heading order, and alt text on images." },
  { icon: "link", title: "Canonical URL", text: "Is there one preferred address for the page, so duplicates don't split its ranking?" },
  { icon: "globe", title: "Open Graph", text: "Will links shared on WhatsApp, LinkedIn and Facebook show a title, text and image?" },
  { icon: "puzzle", title: "Structured data", text: "Is there JSON-LD that tells Google what the page is: a business, a person, a product, an article?" },
  { icon: "search", title: "robots.txt and sitemap", text: "Can search engines crawl the site, and is there a sitemap that lists your pages?" },
  { icon: "lock", title: "HTTPS and indexing", text: "Is the page secure, does it answer with 200 OK, and is it free of noindex tags?" },
  { icon: "mobile", title: "Mobile viewport", text: "Is the page set up for phones? Google ranks the mobile version of your site." },
  { icon: "speed", title: "Core Web Vitals", text: "Google PageSpeed on mobile: performance score, Largest Contentful Paint, layout shift and real-user data when it exists." },
];

const FAQS = [
  {
    q: "Is this SEO audit tool really free?",
    a: "Yes. There is no sign-up and no limit for normal use. You only leave your email if you want the full report sent to your inbox.",
  },
  {
    q: "What does the score mean?",
    a: "It's a weighted score out of 100 based on the technical checks on this page. Problems that stop Google from reading or indexing the page (empty HTML, noindex, no title) weigh the most. 90 or more is strong, 50 to 89 needs work, and under 50 means search engines are struggling with the page.",
  },
  {
    q: "Why does my React site get a low score for server rendering?",
    a: "A standard React app (Vite or Create React App) sends an almost empty HTML file and builds the page in the browser. The tool reads the HTML the way many crawlers do, without running JavaScript, so it sees that empty page. Moving the site to Next.js usually fixes it.",
  },
  {
    q: "Does a high score mean I will rank on Google?",
    a: "No tool can promise that. The score shows whether the technical basics are in place so Google can find, read and understand your page. Rankings also depend on your content, links and competition.",
  },
  {
    q: "Why is speed sometimes not measured?",
    a: "Speed comes from Google PageSpeed Insights, which can be slow or busy. When it doesn't answer in time, the score is calculated from the other checks and the speed check says it wasn't measured. Run the audit again later to include it.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Free SEO audit tool", item: `${SITE.url}${SEO_AUDIT_TOOL.href}` },
      ],
    },
    {
      "@type": "WebApplication",
      name: "Free SEO audit tool",
      url: `${SITE.url}${SEO_AUDIT_TOOL.href}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      creator: { "@id": `${SITE.url}/#person` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

export default function FreeSeoAuditPage() {
  return (
    <SiteShell cta={{ title: <>Want your site <span>fixed</span>, not just checked?</>, text: "SEO audits from $150, technical SEO setup from $500, React to Next.js migrations from $800. Every project starts with a free call." }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="x-hero x-hero-center audit-hero">
        <span className="x-label">Free tool</span>
        <h1 className="x-h1">
          Free <span>SEO audit</span> tool
        </h1>
        <p className="x-hero-lead">
          Find out in under a minute whether Google can actually read your website. Enter your address to get a score out of 100 and a fix list in red, yellow and green.
        </p>
        <AuditTool />
      </section>

      <Section
        label="What it checks"
        title={
          <>
            The technical basics <span>Google needs</span>
          </>
        }
        text="This free SEO audit tool downloads your page the way a search engine crawler does, without running JavaScript, and checks what it finds. Then it asks Google PageSpeed Insights how fast the page loads on a phone."
      >
        <div className="x-grid-4 audit-checks-grid">
          {CHECKS.map((c) => (
            <div key={c.title} className="x-card" data-reveal>
              <span className="x-card-icon is-sm">
                <Icon name={c.icon} size={18} />
              </span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Why I built it" title={<>Most sites fail on <span>the same few things</span></>}>
        <div className="audit-prose" data-reveal>
          <p>
            Most websites that don&apos;t show up on Google have a technical problem, not a content problem. The most common one I see on modern sites is
            empty HTML. A React app built with Vite or Create React App sends the same nearly empty page for every address and builds the content in the
            browser. People with a fast phone never notice. Many crawlers, link previews and AI search tools see a blank page.
          </p>
          <p>
            My <Link href="/services/react-nextjs-seo">React and Next.js SEO service</Link> fixes exactly this on client sites: real HTML for every
            address, unique titles and descriptions, a sitemap and structured data.
          </p>
          <p>
            This tool runs the checks I start every audit with. It reads one page at a time, usually the home page, so run it on your most important
            service or product pages too. Results are saved for 24 hours, so running the same address again shows the same report.
          </p>
          <h3>How to read your results</h3>
          <ul>
            <li>
              <strong>Red (Fix):</strong> something that stops search engines from reading, indexing or trusting the page. Fix these first.
            </li>
            <li>
              <strong>Yellow (Improve):</strong> the basics are there but could be better, for example a title that is too long or a missing sitemap line.
            </li>
            <li>
              <strong>Green (Good):</strong> nothing to do.
            </li>
          </ul>
          <p>
            If the server rendering check is red on a React site, the usual fix is a move to Next.js, which keeps your components and design. I explain
            why in <Link href="/blog/react-website-not-ranking-on-google">why a React website is not ranking on Google</Link>, and the full migration
            story in <Link href="/blog/vite-react-to-nextjs-migration">how I migrated a Vite React site to Next.js 15</Link>.
          </p>
          <h3>What this tool doesn&apos;t check</h3>
          <p>
            It doesn&apos;t look at keywords, backlinks, content quality or every page of your site. A full audit does: my{" "}
            <Link href="/services/react-nextjs-seo">React and Next.js SEO service</Link> starts with an SEO audit from $150, delivered in 2–3 days, with
            a report and a fix list in priority order.
          </p>
        </div>
      </Section>

      <Section label="FAQ" title={<>Questions about the <span>SEO audit</span></>}>
        <Faq items={FAQS} />
      </Section>
    </SiteShell>
  );
}
