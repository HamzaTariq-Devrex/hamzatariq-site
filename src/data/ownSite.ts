// Measured results from Hamza's own site (hamzatariq.site), mobile Lighthouse on a local production
// build, 2026-10-22, after the Vite + React to Next.js 15 migration. Owner facts, mirrored in
// content/owner/profile.md ("Own site results"). Mentioned briefly as "on my own site"; it is not a
// case study and has no project page (client projects are the portfolio).
export const OWN_SITE_RESULTS = {
  seo: { label: "Mobile SEO score (home)", before: "83", after: "100" },
  lcp: { label: "Home page load time (LCP, mobile)", before: "18.0 s", after: "2.6 s" },
  homePerformance: { label: "Mobile performance (home)", before: "35", after: "66" },
  workPerformance: { label: "Mobile performance (/work)", before: "85", after: "97" },
  projectPerformance: { label: "Mobile performance (project pages)", before: "88", after: "99" },
} as const;
