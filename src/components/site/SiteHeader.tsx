"use client";

// The one site header, used on every page including the home page. Links always open real pages.
// On the home page (`home`) every link is a plain <a> (full page load), so GSAP ScrollSmoother and
// WebGL state never leak into other routes; elsewhere next/link is used.
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import { SERVICES } from "@/data/services";
import "../styles/SiteHeader.css";

const NAV = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

type LinkProps = { href: string; className?: string; children: React.ReactNode; home: boolean; pathname: string; onNavigate: () => void };

const NavLink = ({ href, className, children, home, pathname, onNavigate }: LinkProps) => {
  const props = {
    href,
    className,
    "aria-current": isActive(pathname, href) ? ("page" as const) : undefined,
    "data-cursor": "disable",
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      onNavigate();
      e.currentTarget.blur(); // lets the hover/focus dropdown close after a click
    },
  };
  return home ? <a {...props}>{children}</a> : <Link {...props}>{children}</Link>;
};

type Props = { home?: boolean };

const SiteHeader = ({ home = false }: Props) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu after navigating, on Escape and on a click outside it.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const link = { home, pathname, onNavigate: () => setOpen(false) };
  const cls = (href: string) => (isActive(pathname, href) ? "is-active" : "");
  const book = SITE.bookingUrl ? (
    <a href={SITE.bookingUrl} target="_blank" rel="noreferrer" className="site-cta" data-cursor="disable">
      Book a free call
    </a>
  ) : (
    <NavLink {...link} href="/contact" className="site-cta">
      Book a free call
    </NavLink>
  );

  return (
    <header className={`site-header${home ? " is-home" : ""}`}>
      <a href="/" className="site-logo" aria-label="Hamza Tariq, home" data-cursor="disable">
        <Image src={SITE.logo} alt="Hamza Tariq" width={156} height={64} priority />
      </a>

      <nav className="site-nav" aria-label="Primary">
        <div className="site-nav-drop">
          <NavLink {...link} href="/services" className={`site-nav-services ${cls("/services")}`}>
            Services
          </NavLink>
          <div className="site-nav-menu">
            {SERVICES.map((s) => (
              <NavLink {...link} key={s.slug} href={`/services/${s.slug}`} className={cls(`/services/${s.slug}`)}>
                <strong>{s.name}</strong>
                <span>{s.summary}</span>
              </NavLink>
            ))}
          </div>
        </div>
        {NAV.map((n) => (
          <NavLink {...link} key={n.href} href={n.href} className={cls(n.href)}>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="site-cta-wrap">{book}</div>

      <div className="site-mobile" ref={menuRef}>
        <button
          type="button"
          className={`site-burger${open ? " is-open" : ""}`}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="site-mobile-panel"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
        {open && (
          <div className="site-mobile-panel" id="site-mobile-panel">
            <a href="/" data-cursor="disable" onClick={() => setOpen(false)}>
              Home
            </a>
            <NavLink {...link} href="/services" className={cls("/services")}>
              Services
            </NavLink>
            {SERVICES.map((s) => (
              <NavLink {...link} key={s.slug} href={`/services/${s.slug}`} className={`is-sub ${cls(`/services/${s.slug}`)}`}>
                {s.name}
              </NavLink>
            ))}
            {NAV.map((n) => (
              <NavLink {...link} key={n.href} href={n.href} className={cls(n.href)}>
                {n.label}
              </NavLink>
            ))}
            <NavLink {...link} href="/hire" className={cls("/hire")}>
              Hire me
            </NavLink>
            {book}
          </div>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
