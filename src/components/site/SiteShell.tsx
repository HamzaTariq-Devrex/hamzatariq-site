import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/site";
import "../styles/Pages.css";

type Props = { children: React.ReactNode; active?: "work" };

const SiteShell = ({ children, active }: Props) => (
  <div className="page">
    <header className="page-header">
      <a href="/" className="page-logo" aria-label="Hamza Tariq, home">
        <Image src={SITE.logo} alt="Hamza Tariq" width={156} height={64} priority />
      </a>
      <nav className="page-nav" aria-label="Primary">
        <a href="/">Home</a>
        <Link href="/work" className={active === "work" ? "is-active" : ""}>
          Work
        </Link>
        <a href={`mailto:${SITE.email}`}>Contact</a>
      </nav>
      <a href={`mailto:${SITE.email}`} className="page-connect">
        <span className="page-status" aria-hidden="true" />
        <span className="page-connect-full">{SITE.email}</span>
        <span className="page-connect-short">Let&apos;s talk</span>
      </a>
    </header>

    <main className="page-main">{children}</main>

    <footer className="page-footer">
      <div className="page-cta">
        <span className="page-eyebrow">Have a project in mind?</span>
        <h2>
          Let&apos;s build something <span>great</span> together.
        </h2>
        <div className="page-cta-actions">
          <a href={`mailto:${SITE.email}`} className="page-btn page-btn-primary">
            {SITE.email}
          </a>
          <a href={SITE.social.whatsapp} target="_blank" rel="noreferrer" className="page-btn page-btn-ghost">
            WhatsApp
          </a>
        </div>
      </div>
      <div className="page-footer-bottom">
        <span>© {new Date().getFullYear()} Hamza Tariq</span>
        <div className="page-socials">
          <a href={SITE.social.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={SITE.social.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href={SITE.social.whatsapp} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </div>
      </div>
    </footer>
  </div>
);

export default SiteShell;
