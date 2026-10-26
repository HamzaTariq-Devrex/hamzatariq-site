import Link from "next/link";
import { SITE } from "@/lib/site";
import { SERVICES } from "@/data/services";
import BookCall from "./BookCall";
import SiteHeader from "./SiteHeader";
import "../styles/Pages.css";
import "../styles/Content.css";

type Props = { children: React.ReactNode; hideCta?: boolean };

const SiteShell = ({ children, hideCta = false }: Props) => (
  <div className="page">
    <SiteHeader />

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
