import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` gets its own folder so `npm run build` (required before every commit) can't break a running dev server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "www.devrexdigital.site", pathname: "/images/portfolio/**" },
      { protocol: "https", hostname: "dataofclient.nyc3.cdn.digitaloceanspaces.com", pathname: "/Portfolio/**" },
    ],
  },
  async redirects() {
    return [
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
