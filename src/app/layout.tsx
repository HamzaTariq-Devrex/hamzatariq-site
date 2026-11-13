import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE } from "@/lib/site";
import AssistantLoader from "@/components/assistant/AssistantLoader";
import MotionProvider from "@/components/motion/MotionProvider";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Cursor from "@/components/motion/Cursor";
import NavProgress from "@/components/motion/NavProgress";
import Ambient from "@/components/motion/Ambient";
import Preloader, { PRELOADER_SCRIPT } from "@/components/site/Preloader";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/system.css";
// Shared shell styles load here (not only from SiteShell): Next.js leaves CSS imported inside SiteShell
// off the not-found page, which then rendered unstyled.
import "@/components/styles/Pages.css";
import "@/components/styles/Content.css";
import "@/components/styles/Premium.css";
import "@/components/styles/Ui.css";
// The Nebula theme layer (accent words, glass cards, glows, ambient background) loads last.
import "@/components/styles/Theme.css";

// Fonts, all SIL OFL and self-hosted from npm packages (builds never fetch Google Fonts):
// Bricolage Grotesque (display headings), Geist (text) and Instrument Serif italic (accent words).
// display "swap", never "optional": with "optional" Chrome skipped the fonts on a first visit and the
// whole site rendered in Arial. Each has a size-matched fallback measured on the site's text (the
// "… Fallback" faces in system.css; next/font's adjustFontFallback was too wide and shifted the layout
// when the fonts swapped in). Geist is the Latin subset (29 KB), not the full 70 KB file.
// Not Satoshi/General Sans: their Fontshare licence forbids keeping font files in a public repository.
const display = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-display",
  weight: "200 800",
  display: "swap",
  adjustFontFallback: false,
  fallback: ['"Bricolage Fallback"'],
});
const text = localFont({
  src: "../../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  variable: "--font-text",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: false,
  fallback: ['"Geist Fallback"'],
});
const accent = localFont({
  src: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2",
  variable: "--font-accent",
  weight: "400",
  style: "italic",
  display: "swap",
  adjustFontFallback: false,
  fallback: ['"Instrument Serif Fallback"'],
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
  themeColor: "#06050f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable} ${accent.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRELOADER_SCRIPT }} />
      </head>
      <body>
        <Preloader />
        <Ambient />
        <NavProgress />
        <MotionProvider>{children}</MotionProvider>
        <SmoothScroll />
        <Cursor />
        <AssistantLoader />
        {/* Only on Vercel: elsewhere /_vercel/insights/script.js is a 404 (a console error in Lighthouse). */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
