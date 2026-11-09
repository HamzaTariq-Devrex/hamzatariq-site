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

// Client case studies with measured results (owner facts only). Empty for now. The owner's own site is
// never shown as a project or case study (owner, November 2026); /work/hamzatariq-site redirects (301)
// to /services/react-nextjs-seo.
export const CASE_STUDIES: CaseStudy[] = [];

export const getCaseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug);
