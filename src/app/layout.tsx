import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE } from "@/lib/site";
import AssistantLoader from "@/components/assistant/AssistantLoader";
import { Analytics } from "@vercel/analytics/next";
import "@/index.css";

// Geist from the `geist` npm package (self-hosted variable font), so builds never fetch Google Fonts.
const geist = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Hamza Tariq | React & Next.js Developer",
    template: "%s | Hamza Tariq",
  },
  description:
    "Custom-coded Next.js websites, dashboards and AI chatbots, plus SEO fixes for React sites that don't rank on Google. Built by Hamza Tariq for 45+ brands.",
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  icons: { icon: SITE.logo },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_US",
    url: SITE.url,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0a0e17",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        {children}
        <AssistantLoader />
        <Analytics />
      </body>
    </html>
  );
}
