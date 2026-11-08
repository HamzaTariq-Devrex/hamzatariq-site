import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CALENDLY_URL (server env, set in Vercel) is inlined for the Calendly popup on "Book a free call".
  env: { NEXT_PUBLIC_CALENDLY_URL: process.env.CALENDLY_URL ?? "" },
  // `next dev` gets its own folder so `npm run build` (required before every commit) can't break a running dev server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  // Inline the (small) CSS into the HTML: saves the render-blocking stylesheet round trips on mobile.
  experimental: { inlineCss: true },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "www.devrexdigital.site", pathname: "/images/portfolio/**" },
      { protocol: "https", hostname: "dataofclient.nyc3.cdn.digitaloceanspaces.com", pathname: "/Portfolio/**" },
    ],
  },
  async redirects() {
    return [
      // Old CV file name (replaced November 2026).
      { source: "/Hamza%20Tariq%20Resume.pdf", destination: "/Hamza_Tariq_CV.pdf", permanent: true },
      // The own-site case study page was removed (owner: client projects only on work pages).
      { source: "/work/hamzatariq-site", destination: "/services/react-nextjs-seo", statusCode: 301 },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.hamzatariq.site" }],
        destination: "https://hamzatariq.site/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
