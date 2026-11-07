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

// Client case studies with measured results (owner facts only). Empty for now: the own-site results
// are not shown as a case study (owner, November 2026); they live in src/data/ownSite.ts and
// content/owner/profile.md. /work/hamzatariq-site redirects (301) to /services/react-nextjs-seo.
export const CASE_STUDIES: CaseStudy[] = [];

export const getCaseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug);
