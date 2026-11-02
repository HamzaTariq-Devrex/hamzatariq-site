export type PriceTier = {
  name: string;
  price: number;
  unit?: string;
  detail?: string;
  timeline?: string;
  /** Pages included in the price (owner confirmed 2026-11-03); extra pages cost ADD_ONS.extraPage. Unset = quoted by features. */
  pages?: number;
  /** Highlighted as "Most popular" on the pricing cards (owner confirmed: ecommerce store and AI chatbot). */
  popular?: boolean;
};
import type { IconName } from "@/components/site/ds/Icon";

export type Faq = { q: string; a: string };

export type Service = {
  slug: string;
  name: string;
  keyword: string;
  metaTitle: string;
  eyebrow: string;
  h1: string;
  h1Accent: string;
  lead: string;
  summary: string;
  /** Design-system icon for cards and menus (src/components/site/ds/Icon.tsx). */
  icon: IconName;
  problems: { title: string; text: string; icon: IconName }[];
  process: { title: string; text: string }[];
  features: string[];
  pricing: PriceTier[];
  relatedProjects: string[];
  faqs: Faq[];
};

export const PRICE_NOTE = "Every project is quoted after a free call. Final price depends on features.";

/** Add-ons on top of a website package (owner confirmed 2026-11-03). Pages included are on each tier (`pages`). */
export const ADD_ONS = {
  extraPage: { label: "Extra page beyond the package", price: 50, unit: "each" },
  cms: { label: "Content editing (CMS)", price: 150 },
  language: { label: "Second language", price: 250 },
} as const;

/** Terms that apply to every project (owner confirmed 2026-10-26). */
export const PROJECT_TERMS = [
  { label: "Payment", text: "50% upfront, 50% on delivery" },
  { label: "Revisions", text: "2 free revision rounds" },
  { label: "Support", text: "30 days of free bug fixes after launch; ongoing maintenance quoted separately" },
];

export const SERVICES: Service[] = [
  {
    slug: "nextjs-websites",
    icon: "globe",
    name: "Next.js Websites",
    keyword: "Next.js website development",
    metaTitle: "Next.js Website Development for Businesses",
    eyebrow: "Websites & online stores",
    h1: "Next.js website development",
    h1Accent: "for businesses",
    lead: "Custom-coded Next.js websites, from landing pages to full ecommerce apps. No templates: every page is built around your business, loads fast and is ready for Google from day one.",
    summary: "Landing pages, ecommerce stores and full ecommerce apps in custom-coded Next.js.",
    problems: [
      { title: "Your site is slow on mobile", icon: "speed", text: "Theme and page-builder sites ship a lot of code your visitors never use, so pages load slowly on phones and people leave before they see your offer." },
      { title: "It looks like every other site", icon: "design", text: "Templates limit what your site can look like. A custom build is designed around your brand and your customers, not around what a theme allows." },
      { title: "Google can't read it properly", icon: "search", text: "Missing titles, descriptions and structured data, or pages built only in the browser, make it hard for Google to understand and rank your site." },
      { title: "Managing products and orders is a mess", icon: "orders", text: "Selling through DMs and spreadsheets doesn't scale. An online store with an admin dashboard keeps products, stock and orders in one place." },
    ],
    process: [
      { title: "Free call", text: "We talk through your goals, the pages you need and the features that matter. You get a clear quote afterwards." },
      { title: "Plan & design", text: "I map the pages and user flow and design the site around your brand before any code is written." },
      { title: "Build in custom code", text: "I build the site in Next.js with no templates, and you review progress as each part is ready." },
      { title: "Launch & SEO setup", text: "The site goes live with metadata, a sitemap and structured data in place, so Google can find every page." },
    ],
    features: [
      "Custom design built around your brand",
      "Pre-rendered Next.js pages that load fast",
      "Mobile-first, responsive layouts",
      "Technical SEO built in: titles, descriptions, sitemap, structured data",
      "Admin dashboard to manage products and orders (ecommerce)",
      "User logins, accounts and order history (full ecommerce app)",
      "WhatsApp ordering and contact links",
    ],
    pricing: [
      { name: "Landing page / portfolio website", price: 400, timeline: "5–7 days", pages: 5 },
      { name: "Ecommerce store with admin dashboard", price: 1000, timeline: "2–3 weeks", popular: true, pages: 10 },
      { name: "Full ecommerce app", price: 2000, detail: "User logins, accounts and orders", pages: 15 },
    ],
    relatedProjects: ["dulhahouse", "nagina-jewels", "the-trekkerz-pakistan"],
    faqs: [
      { q: "How much does a Next.js website cost?", a: "Prices start from $400 for a landing page or portfolio website, $1,000 for an ecommerce store with an admin dashboard and $2,000 for a full ecommerce app with user logins, accounts and orders. Every project is quoted after a free call, and the final price depends on features." },
      { q: "How long does a Next.js website take?", a: "A landing page or portfolio website usually takes 5–7 days, and an ecommerce store with an admin dashboard 2–3 weeks. A full ecommerce app depends on its features, so its timeline is planned on the free call." },
      { q: "Why Next.js instead of a WordPress or Shopify theme?", a: "Next.js pre-renders your pages into HTML, so they load fast and Google can read them straight away. Because the site is custom code, the design is not limited by a theme and you don't carry the weight of plugins you don't need." },
      { q: "Do you use templates?", a: "No. I write everything in custom code, so every site is built around the business it serves." },
      { q: "Can you build an online store with an admin dashboard?", a: "Yes. An ecommerce store with an admin dashboard starts from $1,000, and a full ecommerce app with user accounts and orders starts from $2,000. Stores built at Devrex Digital include Dulhahouse and Nagina Jewels." },
      { q: "Will my new website be SEO-ready?", a: "Yes. Every site launches with pre-rendered pages, unique titles and descriptions, a sitemap and structured data. It is the same setup I used on this site." },
    ],
  },
  {
    slug: "dashboards",
    icon: "chart",
    name: "Dashboards & Web Apps",
    keyword: "custom dashboard development",
    metaTitle: "Custom Dashboard and Web App Development",
    eyebrow: "Dashboards & web apps",
    h1: "Custom dashboard development",
    h1Accent: "and web apps",
    lead: "Dashboards and web apps built around how your business actually works, so your team stops juggling spreadsheets and sees what matters in one place.",
    summary: "Custom admin dashboards and web apps built around how your business works.",
    problems: [
      { title: "Your data lives in spreadsheets", icon: "sheet", text: "Orders, customers and numbers are spread across files and chats, and nobody is sure which version is current." },
      { title: "Off-the-shelf tools don't fit", icon: "puzzle", text: "Generic software makes you change how you work, or charges for features you never use while missing the ones you need." },
      { title: "No single view of the business", icon: "eye", text: "Without one place to see sales, stock or bookings, decisions are made on guesswork." },
      { title: "The same manual work every day", icon: "repeat", text: "Copying data between tools and building the same reports by hand costs your team hours." },
    ],
    process: [
      { title: "Free call", text: "You walk me through how your business runs today and what you want the dashboard or app to do." },
      { title: "Map workflows & data", text: "I map the screens, user roles and data you need before building anything." },
      { title: "Build", text: "I build it in React and Next.js with a real database, and you test each part as it is ready." },
      { title: "Launch & handover", text: "It goes live with secure logins for you and your team, and I walk you through using it." },
    ],
    features: [
      "Secure logins for you and your team",
      "Manage products, orders, customers or bookings",
      "Charts and reports for the numbers you track",
      "Screens designed around your workflow",
      "Built with React, Next.js and a real database",
      "Works on desktop and mobile",
    ],
    pricing: [
      { name: "Custom dashboard", price: 1200, timeline: "2–4 weeks" },
      { name: "Custom web app", price: 2500, timeline: "4–8 weeks" },
    ],
    relatedProjects: [],
    faqs: [
      { q: "How much does a custom dashboard cost?", a: "A custom dashboard starts from $1,200 and a custom web app from $2,500. Every project is quoted after a free call, and the final price depends on features." },
      { q: "How long does a custom dashboard take?", a: "A custom dashboard usually takes 2–4 weeks and a custom web app 4–8 weeks, depending on the screens, user roles and features you need." },
      { q: "What is the difference between a dashboard and a web app?", a: "A dashboard is mainly for viewing and managing your data, such as orders, stock or bookings. A web app is a fuller product with its own users, workflows and features, for your team or your customers." },
      { q: "Can it work with the data I already have?", a: "Often, yes. On the free call we look at where your data lives today, such as spreadsheets or another tool, and plan how to bring it in." },
      { q: "Who can log in?", a: "You decide. Dashboards are built with secure logins, and different people can see different parts if you need that." },
      { q: "Can I use it on my phone?", a: "Yes. Dashboards and web apps are built to work on desktop and mobile." },
    ],
  },
  {
    slug: "ai-chatbots",
    icon: "message",
    name: "AI Chatbots",
    keyword: "AI chatbot for website",
    metaTitle: "AI Chatbot for Website Built on Your Content",
    eyebrow: "AI chatbots",
    h1: "AI chatbot for your website",
    h1Accent: "trained on your content",
    lead: "An AI chatbot that answers your customers' questions from your own content, day and night, and passes real leads to you on WhatsApp or email.",
    summary: "AI chatbots that answer from your own content and pass leads to you.",
    problems: [
      { title: "The same questions, every day", icon: "chat", text: "Prices, delivery, opening hours: your team answers the same messages over and over." },
      { title: "Visitors leave after hours", icon: "moon", text: "If nobody replies at night or on weekends, people who were ready to buy go somewhere else." },
      { title: "Leads get lost", icon: "leads", text: "Interested visitors close the tab without leaving their details, and you never hear from them." },
      { title: "Generic bots give wrong answers", icon: "warning", text: "Off-the-shelf chatbots guess. A bot trained only on your content answers from what you actually offer." },
    ],
    process: [
      { title: "Free call", text: "We go through the questions your customers ask most and what the chatbot should do." },
      { title: "Collect your content", text: "I gather your services, prices, FAQs and policies as the chatbot's knowledge." },
      { title: "Build & train", text: "I build the chatbot, set its tone to match your brand and test it against real questions." },
      { title: "Launch on your site", text: "It goes live on your website, with handover to WhatsApp or email when a person is needed." },
    ],
    features: [
      "Answers only from your own content",
      "Says when it doesn't know, instead of guessing",
      "Collects visitor details for real leads",
      "Handover to WhatsApp or email",
      "Custom look that matches your brand",
      "Works on mobile, full-screen chat",
    ],
    pricing: [{ name: "AI chatbot", price: 350, timeline: "3–5 days", popular: true }],
    relatedProjects: [],
    faqs: [
      { q: "How much does an AI chatbot for a website cost?", a: "An AI chatbot starts from $350. Every project is quoted after a free call, and the final price depends on features." },
      { q: "How long does it take to add an AI chatbot?", a: "An AI chatbot usually takes 3–5 days, from collecting your content to testing it and launching it on your site." },
      { q: "Will the chatbot make things up?", a: "It is set up to answer only from your content and to say when it doesn't know, then offer to connect the visitor with you." },
      { q: "Can it send leads to my WhatsApp?", a: "Yes. When a visitor wants to talk to a person, the chatbot can hand them over to WhatsApp or collect their details for you." },
      { q: "Which AI model does it use?", a: "I build with modern AI models such as Google Gemini, chosen to keep answers accurate and running costs low." },
      { q: "Do I need technical knowledge to use it?", a: "No. I set everything up on your website. You only need to tell me when your prices or services change." },
    ],
  },
  {
    slug: "react-nextjs-seo",
    icon: "search",
    name: "React & Next.js SEO",
    keyword: "React SEO services",
    metaTitle: "React SEO Services for Sites That Don't Rank",
    eyebrow: "React & Next.js SEO",
    h1: "React SEO services",
    h1Accent: "that get you ranking",
    lead: "Most React sites don't rank because their pages are rendered in the browser, so Google first sees an almost empty HTML page. I fix that with server-rendered pages, clean metadata and structured data, without changing your design.",
    summary: "Fix React and Next.js sites that don't rank on Google, without changing the design.",
    problems: [
      { title: "Google sees an empty page", icon: "empty", text: "A Vite or Create React App site sends an almost empty HTML file and builds the page in the browser. Google has to render JavaScript before it sees your content, and often indexes less of it." },
      { title: "Every page has the same title", icon: "tag", text: "Single-page apps often share one title and description, so Google can't tell your pages apart and none of them stands out." },
      { title: "It is slow on mobile", icon: "mobile", text: "Large JavaScript bundles and heavy images hurt Core Web Vitals, which affects both rankings and how many visitors stay." },
      { title: "No sitemap or structured data", icon: "map", text: "Without a sitemap, canonical URLs and structured data, search engines find and understand your pages more slowly." },
    ],
    process: [
      { title: "SEO audit", text: "I check how Google sees your site and give you a report with a prioritized fix list." },
      { title: "Plan the fixes", text: "We agree what to fix first, and whether your site needs a move to Next.js or can be fixed where it is." },
      { title: "Fix or migrate", text: "I add server-rendered pages, metadata and structured data, or migrate the site to Next.js while keeping your design." },
      { title: "Submit & monitor", text: "I submit your sitemap, set up IndexNow and Search Console, and check that pages are being indexed." },
    ],
    features: [
      "Vite or Create React App to Next.js migration, design kept",
      "Server-rendered or pre-rendered pages Google can read",
      "Unique titles, descriptions and canonical URLs on every page",
      "JSON-LD structured data",
      "Sitemap, robots.txt and IndexNow",
      "Core Web Vitals and image optimization",
      "Social preview images for every page",
    ],
    pricing: [
      { name: "SEO audit", price: 150, detail: "Report + prioritized fix list", timeline: "2–3 days" },
      { name: "Technical SEO setup for React / Next.js", price: 500 },
      { name: "React (Vite/CRA) to Next.js migration for SEO", price: 800 },
      { name: "Monthly SEO + content", price: 400, unit: "/month" },
    ],
    relatedProjects: ["hamzatariq-site"],
    faqs: [
      { q: "Why is my React website not ranking on Google?", a: "Usually because the pages are rendered in the browser. Google first receives an almost empty HTML file, every page may share the same title, and there is often no sitemap or structured data. Server-rendered pages with proper metadata fix the root cause." },
      { q: "Do I have to move my site to Next.js?", a: "Not always. The SEO audit shows what is holding your site back. If it is fully rendered in the browser, a migration to Next.js is usually the cleanest fix. It starts from $800." },
      { q: "Will a migration change my design?", a: "No. The goal is to keep your design and move the same pages onto server rendering. This site was migrated from Vite and React to Next.js 15 with its 3D design intact." },
      { q: "How soon will my rankings improve?", a: "Fixes are live as soon as they are deployed, but Google needs time to recrawl your pages. Nobody can honestly promise a ranking or a date, so I focus on fixing what is measurably wrong." },
      { q: "What does the SEO audit include?", a: "A report on how Google sees your site and a prioritized list of fixes. It costs $150, usually takes 2–3 days, and you can use it with any developer." },
    ],
  },
];

export const getService = (slug: string) => SERVICES.find((s) => s.slug === slug);

export const formatPrice = (tier: PriceTier) => `$${tier.price.toLocaleString("en-US")}${tier.unit ?? ""}`;

/** The process every project follows (About and /services). Facts from the service pages and PROJECT_TERMS. */
export const PROCESS: { title: string; text: string; icon: IconName }[] = [
  { title: "Free call", text: "We talk through your goals and the features that matter. You get a clear quote afterwards.", icon: "call" },
  { title: "Plan & design", text: "I map the pages, screens and data, and design around your brand before any code is written.", icon: "plan" },
  { title: "Build in custom code", text: "I build in React and Next.js with no templates, and you review each part as it's ready.", icon: "code" },
  { title: "Launch & support", text: "It goes live with SEO set up, followed by 30 days of free bug fixes.", icon: "rocket" },
];

/** FAQ for /services (also used for its FAQPage schema). */
export const GENERAL_FAQS: Faq[] = [
  {
    q: "Which service do I need?",
    a: "For a new website or online store, start with Next.js websites. If your team runs orders, stock or bookings from spreadsheets, a custom dashboard fits. To answer customer questions automatically, an AI chatbot. If your React site doesn't rank on Google, React & Next.js SEO. Not sure? Ask the AI assistant or book a free call.",
  },
  {
    q: "How much does a project cost?",
    a: "Starting prices: websites from $400, ecommerce stores from $1,000, custom dashboards from $1,200, web apps from $2,500, AI chatbots from $350 and SEO audits from $150. Every project is quoted after a free call, and the final price depends on features.",
  },
  {
    q: "How long does a project take?",
    a: "Usually 5–7 days for a landing page, 3–5 days for an AI chatbot, 2–3 days for an SEO audit, 2–3 weeks for an ecommerce store, 2–4 weeks for a custom dashboard and 4–8 weeks for a custom web app. The exact timeline comes with your quote.",
  },
  { q: "What are the payment terms?", a: "50% upfront and 50% on delivery." },
  { q: "How many revisions are included?", a: "Every project includes 2 free revision rounds, and you review the work as each part is ready." },
  {
    q: "Do you offer support after launch?",
    a: "Yes. You get 30 days of free bug fixes after launch. Ongoing maintenance is quoted separately.",
  },
];
