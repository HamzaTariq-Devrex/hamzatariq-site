// Career, education and skills from Hamza's CV (public/Hamza_Tariq_CV.pdf, November 2026).
// Keep in sync with the CV and content/owner/profile.md.

export type Job = {
  role: string;
  company: string;
  period: string;
  current: boolean;
  body: string;
  /** CV bullet points (shown on /hire). */
  highlights: string[];
  tags: string[];
};

/** CV summary, for recruiters (/hire). */
export const CV_SUMMARY =
  "Frontend Developer with 2+ years shipping production web applications in Next.js, React and TypeScript. I've delivered 40+ live production websites for retail brands, agencies and consultancies across Pakistan and the UK, specialising in custom-coded ecommerce: product catalogues, cart and checkout flows, Supabase-backed admin dashboards and performance tuning on Vercel. I own delivery end to end, from requirements to post-launch support.";

export const JOBS: Job[] = [
  {
    role: "Founder & Frontend Developer",
    company: "Devrex Digital",
    period: "Jan 2023 - Present",
    current: true,
    body: "Built and shipped 40+ production websites for startups, retail brands and consultancies, as the sole frontend developer on each build, for remote clients in Pakistan and the UK. Custom-coded ecommerce storefronts, Supabase-backed admin dashboards and the full client lifecycle, with most new work coming from referrals and repeat clients.",
    highlights: [
      "Built and shipped 40+ production websites for startups, retail brands and consultancies, all live, as the sole frontend developer on each build.",
      "Developed custom ecommerce storefronts end to end in Next.js and TypeScript: product catalogues, category and filter pages, cart and checkout, hand-coded rather than templated.",
      "Designed the Supabase layer for each project (auth, Postgres schema, storage and access rules) and built React/TypeScript admin dashboards on top for order and product management.",
      "Created a reusable component library and design system shared across client projects, cutting new-build setup time and keeping the UI consistent.",
      "Improved Core Web Vitals through image optimisation, lazy loading, route-level code splitting and Next.js caching, for mobile-first markets on slower networks.",
      "Owned the full client lifecycle: requirements, scoping, delivery, Vercel deployment and post-launch support.",
    ],
    tags: ["Next.js", "TypeScript", "Supabase", "Ecommerce", "Admin Dashboards", "Core Web Vitals"],
  },
];

export const EDUCATION = "BS in Artificial Intelligence";
export const UNIVERSITY = { name: "The Islamia University of Bahawalpur", period: "2022 - 2026", url: "https://www.iub.edu.pk" };

export const EDUCATION_HISTORY = [
  { title: EDUCATION, school: UNIVERSITY.name, period: UNIVERSITY.period },
  { title: "ICS (Intermediate in Computer Science)", school: "SE College Bahawalpur", period: "2020 - 2022" },
];

export const LANGUAGES = [
  { name: "English", level: "Professional working proficiency" },
  { name: "Urdu", level: "Native" },
];

export const CV_SKILLS = [
  { group: "Frameworks", items: ["Next.js (App Router, SSR/SSG)", "React.js", "TypeScript", "JavaScript (ES6+)", "HTML5", "CSS3"] },
  { group: "Styling & UI", items: ["Tailwind CSS", "Responsive / mobile-first design", "GSAP animations", "Design systems"] },
  { group: "Backend & data", items: ["Supabase (Auth, Postgres, Storage)", "REST APIs", "Schema design"] },
  { group: "Deployment", items: ["Git & GitHub", "Vercel", "Core Web Vitals & performance", "Technical SEO"] },
  { group: "Professional", items: ["Client communication", "Requirements scoping", "Independent project delivery"] },
];

/** "Selected projects" on the CV, in CV order (slugs in src/data/projects.ts). */
export const CV_PROJECTS = ["dulhahouse", "nagina-jewels", "auraluxebags", "the-trekkerz-pakistan", "ascendant-consulting"];
