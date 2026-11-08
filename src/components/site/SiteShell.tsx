import Link from "next/link";
import { SITE } from "@/lib/site";
import { SERVICES } from "@/data/services";
import { TOOLS } from "@/data/tools";
import { SOLUTIONS_LINK } from "@/data/solutions";
import BookCall from "./BookCall";
import SiteHeader from "./SiteHeader";
import Reveal from "./ds/Reveal";
import Magnetic from "../motion/Magnetic";

type Props = {
  children: React.ReactNode;
  hideCta?: boolean;
  /** Heading and line for the closing CTA band. */
  cta?: { title: React.ReactNode; text?: string };
  /** Sticky "Book a free call" bar on phones (service pages). */
  stickyCta?: boolean;
};

const DEFAULT_CTA = {
  title: (
    <>
      Let&apos;s work <span>together.</span>
    </>
  ),
  text: "Tell me what you want to build or fix. You'll get a clear plan and quote after a free call.",
};

const SiteShell = ({ children, hideCta = false, cta = DEFAULT_CTA, stickyCta = false }: Props) => (
  <div className="page">
    <SiteHeader />
    <Reveal />

    <main className="page-main">{children}</main>

    {stickyCta && (
      <div className="x-sticky-cta">
        <BookCall />
      </div>
    )}

    {!hideCta && (
      <div className="cta-marquee" aria-hidden="true">
        <div className="cta-marquee-track">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i}>Let&apos;s work together&nbsp;·&nbsp;</span>
          ))}
        </div>
      </div>
    )}

    <footer className="page-footer">
      {!hideCta && (
        <div className="page-cta" data-reveal>
          <span className="page-eyebrow">Have a project in mind?</span>
          <h2>{cta.title}</h2>
          {cta.text && <p className="page-cta-text">{cta.text}</p>}
          <div className="page-cta-actions">
            <Magnetic>
              <BookCall />
            </Magnetic>
            <a href={`mailto:${SITE.email}`} className="page-btn page-btn-ghost">
              {SITE.email}
            </a>
          </div>
        </div>
      )}

      <div className="page-footer-cols">
        <div>
          <p className="page-footer-title">Services</p>
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`}>
              {s.name}
            </Link>
          ))}
          <Link href={SOLUTIONS_LINK.href}>{SOLUTIONS_LINK.name}</Link>
        </div>
        <div>
          <p className="page-footer-title">Free tools</p>
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href}>
              {t.name}
            </Link>
          ))}
        </div>
        <div>
          <p className="page-footer-title">Pages</p>
          <a href="/">Home</a>
          <Link href="/work">Work</Link>
          <Link href="/about">About</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/hire">Hire me</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div>
          <p className="page-footer-title">Connect</p>
          <a href={`mailto:${SITE.email}`}>Email</a>
          <a href={SITE.social.whatsapp} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a href={SITE.social.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={SITE.social.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
        </div>
      </div>

      <div className="page-footer-bottom">
        <span>© {new Date().getFullYear()} Hamza Tariq</span>
        <span>
          {SITE.location} · {SITE.timezones}
        </span>
        <span>
          Founder of{" "}
          <a href={SITE.agency.url} target="_blank" rel="noreferrer">
            {SITE.agency.name}
          </a>
        </span>
      </div>
    </footer>
  </div>
);

export default SiteShell;
