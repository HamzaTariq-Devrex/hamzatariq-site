import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE } from "@/lib/site";
import AssistantLoader from "@/components/assistant/AssistantLoader";
import MotionProvider from "@/components/motion/MotionProvider";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/system.css";
// Shared shell styles load here (not only from SiteShell): Next.js leaves CSS imported inside SiteShell
// off the not-found page, which then rendered unstyled.
import "@/components/styles/Pages.css";
import "@/components/styles/Content.css";
import "@/components/styles/Premium.css";

// Geist (self-hosted variable font, SIL OFL: src/fonts/Geist-OFL.txt), so builds never fetch Google
// Fonts. Subset to Latin + the punctuation, arrows and symbols the site uses (32 KB instead of 68 KB):
// text LCP on mobile waits for this file. Made with fontTools from node_modules/geist/dist/fonts/
// geist-sans/Geist-Variable.woff2 (unicodes U+0000-00FF, U+2000-206F, U+2190-2199, €, ™, −, ✓, ×).
const geist = localFont({
  src: "../fonts/Geist-Variable-Latin.woff2",
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
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_US",
    url: SITE.url,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#08090c",
  width: "device-width",
  initialScale: 1,
};

// Accent colour (src/styles/system.css): teal by default. For comparing on localhost, ?accent=iris (or
// ?accent=teal) switches it and remembers the choice in this browser.
const ACCENT = process.env.NEXT_PUBLIC_ACCENT === "iris" ? "iris" : "teal";
const accentScript = `try{var q=new URLSearchParams(location.search).get("accent");if(q==="iris"||q==="teal")localStorage.setItem("accent",q);var a=localStorage.getItem("accent");if(a==="iris"||a==="teal")document.documentElement.dataset.accent=a}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} data-accent={ACCENT} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentScript }} />
      </head>
      <body>
        <MotionProvider>{children}</MotionProvider>
        <AssistantLoader />
        <Analytics />
      </body>
    </html>
  );
}
