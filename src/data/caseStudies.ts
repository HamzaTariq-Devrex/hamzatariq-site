export type CaseStudy = {
  slug: string;
  title: string;
  label: string;
  url: string;
  domain: string;
  headline: string;
  summary: string;
  client: string;
  problem: string[];
  solution: string[];
  results: { label: string; before: string; after: string }[];
  stack: string[];
  features: string[];
  images: { src: string; alt: string; width: number; height: number; mobile?: boolean }[];
  services: string[];
};

// Numbers below are the mobile Lighthouse results measured in Phase 1 (local production build, 2026-10-22).
export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "hamzatariq-site",
    title: "hamzatariq.site",
    label: "Own project · React to Next.js SEO",
    url: "https://hamzatariq.site",
    domain: "hamzatariq.site",
    headline: "From an empty HTML page to a mobile SEO score of 100",
    summary:
      "My own portfolio was a Vite and React single-page app that Google could barely read. I migrated it to Next.js 15, kept the 3D design, and rebuilt the technical SEO from the ground up.",
    client: "My own portfolio and lead site, the site you are on now.",
    problem: [
      "The site was a Vite + React single-page app. Every URL returned the same almost empty HTML file, and the content was built in the browser.",
      "There was one hard-coded title for every page, no meta description, no sitemap, no robots.txt and no structured data.",
      "On mobile the home page took 18 seconds to show its main content, because the 3D character and preloader blocked the page.",
    ],
    solution: [
      "Migrated the whole site to Next.js 15 (App Router) and React 19, keeping the existing design, the GSAP animations and the 3D character.",
      "Pre-rendered every page, including 31 project pages, as static HTML so search engines get the full content on the first request.",
      "Added unique titles and 150–160 character descriptions, canonical URLs, a sitemap, robots.txt and JSON-LD structured data on every page.",
      "Generated a social preview image for every page type, moved images to next/image and self-hosted the font.",
      "Set up IndexNow so Bing and Yandex are told about new pages automatically after every deploy.",
    ],
    results: [
      { label: "Mobile SEO score (home)", before: "83", after: "100" },
      { label: "Home page load time (LCP, mobile)", before: "18.0 s", after: "2.6 s" },
      { label: "Mobile performance (home)", before: "35", after: "66" },
      { label: "Mobile performance (/work)", before: "85", after: "97" },
      { label: "Mobile performance (project pages)", before: "88", after: "99" },
    ],
    stack: ["Next.js 15", "React 19", "TypeScript", "GSAP", "Three.js", "Vercel"],
    features: [
      "All pages pre-rendered as static HTML",
      "Unique titles, descriptions and canonical URLs",
      "Sitemap and robots.txt",
      "JSON-LD structured data",
      "Social preview images for every page",
      "IndexNow submission on every deploy",
    ],
    images: [
      { src: "/images/work/hamzatariq-site-home.webp", alt: "hamzatariq.site home page with the 3D character on desktop", width: 1440, height: 900 },
      { src: "/images/work/hamzatariq-site-mobile.webp", alt: "hamzatariq.site home page on mobile", width: 390, height: 844, mobile: true },
      { src: "/images/work/hamzatariq-site-project.webp", alt: "A pre-rendered project page on hamzatariq.site", width: 1440, height: 900 },
    ],
    services: ["react-nextjs-seo", "nextjs-websites"],
  },
];

export const getCaseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug);
