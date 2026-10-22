import { useEffect, type PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Pages.css";

const EMAIL = "hamzabuildsweb@gmail.com";
const LOGO =
  "https://dataofclient.nyc3.cdn.digitaloceanspaces.com/Portfolio/Hamza%20Tariq%20Portfolio%20Logo.png";

type Props = PropsWithChildren<{ title: string; description?: string }>;

const PageShell = ({ title, description, children }: Props) => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.body.style.overflowY = "auto";
    document.body.classList.add("page-body");
    return () => document.body.classList.remove("page-body");
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    document.title = title;
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);

  return (
    <div className="page">
      <header className="page-header">
        <a href="/" className="page-logo" aria-label="Home">
          <img src={LOGO} alt="Hamza Tariq" />
        </a>
        <nav className="page-nav" aria-label="Primary">
          <a href="/">Home</a>
          <Link to="/work" className={pathname.startsWith("/work") ? "is-active" : ""}>
            Work
          </Link>
          <a href={`mailto:${EMAIL}`}>Contact</a>
        </nav>
        <a href={`mailto:${EMAIL}`} className="page-connect">
          <span className="page-status" aria-hidden="true" />
          <span className="page-connect-full">{EMAIL}</span>
          <span className="page-connect-short">Let's talk</span>
        </a>
      </header>

      <main className="page-main">{children}</main>

      <footer className="page-footer">
        <div className="page-cta">
          <span className="page-eyebrow">Have a project in mind?</span>
          <h2>
            Let's build something <span>great</span> together.
          </h2>
          <div className="page-cta-actions">
            <a href={`mailto:${EMAIL}`} className="page-btn page-btn-primary">
              {EMAIL}
            </a>
            <a
              href="https://wa.me/923054122637"
              target="_blank"
              rel="noreferrer"
              className="page-btn page-btn-ghost"
            >
              WhatsApp
            </a>
          </div>
        </div>
        <div className="page-footer-bottom">
          <span>© {new Date().getFullYear()} Hamza Tariq</span>
          <div className="page-socials">
            <a href="https://github.com/Pulsefire-Hamza" target="_blank" rel="noreferrer">
              Github
            </a>
            <a href="https://www.instagram.com/hamzatariq.dev/" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://wa.me/923054122637" target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PageShell;
