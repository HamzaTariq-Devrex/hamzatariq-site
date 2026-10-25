import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/site";
import { SERVICES } from "@/data/services";
import BookCall from "./BookCall";
import "../styles/Pages.css";
import "../styles/Content.css";

export type NavKey = "services" | "work" | "about" | "hire" | "contact";
type Props = { children: React.ReactNode; active?: NavKey; hideCta?: boolean };

const NAV: { key: NavKey; href: string; label: string }[] = [
  { key: "work", href: "/work", label: "Work" },
  { key: "about", href: "/about", label: "About" },
  { key: "contact", href: "/contact", label: "Contact" },
];

const SiteShell = ({ children, active, hideCta = false }: Props) => (
  <div className="page">
    <header className="page-header">
      <a href="/" className="page-logo" aria-label="Hamza Tariq, home">
        <Image src={SITE.logo} alt="Hamza Tariq" width={156} height={64} priority />
      </a>

      <nav className="page-nav" aria-label="Primary">
        <div className="page-nav-drop">
          <Link href="/services" className={active === "services" ? "is-active" : ""}>
            Services
          </Link>
          <div className="page-nav-menu">
            {SERVICES.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`}>
                <strong>{s.name}</strong>
                <span>{s.summary}</span>
              </Link>
            ))}
          </div>
        </div>
        {NAV.map((n) => (
          <Link key={n.key} href={n.href} className={active === n.key ? "is-active" : ""}>
            {n.label}
          </Link>
        ))}
      </nav>

      <BookCall className="page-header-cta" />

      <details className="page-mobile">
        <summary aria-label="Open menu">
          <span />
          <span />
        </summary>
        <div className="page-mobile-panel">
          <a href="/">Home</a>
          <Link href="/services">Services</Link>
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="is-sub">
              {s.name}
            </Link>
          ))}
          {NAV.map((n) => (
            <Link key={n.key} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/hire">Hire me</Link>
          <BookCall />
        </div>
      </details>
    </header>

    <main className="page-main">{children}</main>

    <footer className="page-footer">
      {!hideCta && (
        <div className="page-cta">
          <span className="page-eyebrow">Have a project in mind?</span>
          <h2>
            Let&apos;s build something <span>great</span> together.
          </h2>
          <div className="page-cta-actions">
            <BookCall />
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
        </div>
        <div>
          <p className="page-footer-title">Pages</p>
          <a href="/">Home</a>
          <Link href="/work">Work</Link>
          <Link href="/about">About</Link>
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
