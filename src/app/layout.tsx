import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE } from "@/lib/site";
import AssistantLoader from "@/components/assistant/AssistantLoader";
import MotionProvider from "@/components/motion/MotionProvider";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Cursor from "@/components/motion/Cursor";
import NavProgress from "@/components/motion/NavProgress";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/system.css";
// Shared shell styles load here (not only from SiteShell): Next.js leaves CSS imported inside SiteShell
// off the not-found page, which then rendered unstyled.
import "@/components/styles/Pages.css";
import "@/components/styles/Content.css";
import "@/components/styles/Premium.css";
import "@/components/styles/Ui.css";

// Instrument Sans (SIL OFL 1.1), self-hosted from the @fontsource-variable package: the Latin subset
// of the variable weight axis, so builds never fetch Google Fonts. Chosen over Satoshi/General Sans
// because their Fontshare licence forbids keeping the font files in a public repository.
const display = localFont({
  src: "../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
  variable: "--font-display",
  weight: "400 700",
  display: "optional",
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
  themeColor: "#f2f2ef",
  width: "device-width",
  initialScale: 1,
};

// Accent colour (src/styles/system.css): vermilion by default. For comparing on localhost,
// ?accent=cobalt (or ?accent=vermilion) switches it and remembers the choice in this browser.
const ACCENT = process.env.NEXT_PUBLIC_ACCENT === "cobalt" ? "cobalt" : "vermilion";
const accentScript = `try{var q=new URLSearchParams(location.search).get("accent");if(q==="cobalt"||q==="vermilion")localStorage.setItem("accent",q);var a=localStorage.getItem("accent");if(a==="cobalt"||a==="vermilion")document.documentElement.dataset.accent=a}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable} data-accent={ACCENT} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentScript }} />
      </head>
      <body>
        <NavProgress />
        <MotionProvider>{children}</MotionProvider>
        <SmoothScroll />
        <Cursor />
        <AssistantLoader />
        <Analytics />
      </body>
    </html>
  );
}
