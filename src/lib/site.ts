export const SITE = {
  url: "https://hamzatariq.site",
  name: "Hamza Tariq",
  jobTitle: "Full-Stack Developer, React & Next.js",
  email: "hamzabuildsweb@gmail.com",
  logo: "https://dataofclient.nyc3.cdn.digitaloceanspaces.com/Portfolio/Hamza%20Tariq%20Portfolio%20Logo.png",
  photo: {
    src: "/images/hamza-tariq-2026.webp",
    width: 1024,
    height: 1024,
    alt: "Hamza Tariq, React and Next.js developer",
  },
  positioning:
    "I build custom-coded Next.js websites, dashboards and AI chatbots, and fix React sites that don't rank on Google, so your site loads fast, ranks and turns visitors into customers.",
  /** Short line under the name (About hero, author box). */
  role: "Founder of Devrex Digital · React & Next.js developer",
  bio: "I'm Hamza Tariq, founder of Devrex Digital and a full-stack developer specializing in React and Next.js. With my team I've delivered websites and web apps for 45+ brands, from landing pages and ecommerce stores to admin dashboards and AI chatbots. I write everything in custom code, with no templates, so every site is fast, secure, SEO-ready and built around the business it serves.",
  agency: { name: "Devrex Digital", url: "https://www.devrexdigital.site" },
  // International focus (owner): no city on pages. The city appears only in the Person schema address.
  location: "Based in Pakistan · Working with clients worldwide",
  timezones: "Available in US, UK and EU time zones",
  address: { addressLocality: "Bahawalpur", addressCountry: "PK" },
  social: {
    github: "https://github.com/HamzaTariq-Devrex",
    whatsapp: "https://wa.me/923054122637",
    instagram: "https://www.instagram.com/hamzatariq.dev/",
  },
  // Calendly link from the CALENDLY_URL env var (see next.config.ts). TODO(owner) until it is set:
  // every "Book a free call" button goes to /contact (form, email, WhatsApp) instead.
  bookingUrl: (process.env.NEXT_PUBLIC_CALENDLY_URL || null) as string | null,
  // TODO(owner): new CV PDF. The /hire download stays hidden until this is set.
  cvUrl: null as string | null,
} as const;

export const isProductionSite = process.env.VERCEL_ENV === "production";
