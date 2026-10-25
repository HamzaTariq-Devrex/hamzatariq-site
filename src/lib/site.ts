export const SITE = {
  url: "https://hamzatariq.site",
  name: "Hamza Tariq",
  jobTitle: "Full-Stack Developer, React & Next.js",
  email: "hamzabuildsweb@gmail.com",
  logo: "https://dataofclient.nyc3.cdn.digitaloceanspaces.com/Portfolio/Hamza%20Tariq%20Portfolio%20Logo.png",
  photo: {
    src: "/images/hamza-tariq.webp",
    width: 1024,
    height: 1024,
    alt: "Hamza Tariq, React and Next.js developer",
  },
  positioning:
    "I build custom-coded Next.js websites, dashboards and AI chatbots, and fix React sites that don't rank on Google, so your site loads fast, ranks and turns visitors into customers.",
  bio: "I'm Hamza Tariq, a full-stack developer specializing in React and Next.js. At Devrex Digital I've helped build websites and web apps for 45+ brands, from landing pages and ecommerce stores to admin dashboards and AI chatbots. I write everything in custom code, with no templates, so every site is fast, secure, SEO-ready and built around the business it serves.",
  agency: { name: "Devrex Digital", url: "https://www.devrexdigital.site" },
  social: {
    github: "https://github.com/HamzaTariq-Devrex",
    whatsapp: "https://wa.me/923054122637",
    instagram: "https://www.instagram.com/hamzatariq.dev/",
  },
  // TODO(owner): Cal.com booking link. Until set, booking CTAs fall back to /contact (email + WhatsApp).
  bookingUrl: null as string | null,
  // TODO(owner): new CV PDF. The /hire download stays hidden until this is set.
  cvUrl: null as string | null,
} as const;

export const isProductionSite = process.env.VERCEL_ENV === "production";
