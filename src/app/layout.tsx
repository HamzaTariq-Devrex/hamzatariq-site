import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SITE } from "@/lib/site";
import AssistantLoader from "@/components/assistant/AssistantLoader";
import "@/index.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

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
      </body>
    </html>
  );
}
