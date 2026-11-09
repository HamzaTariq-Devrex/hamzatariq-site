"use client";

// The one site header, on every page. Links always open real pages. Behaves like Aceternity UI's
// Floating Navbar (ui.aceternity.com/components/floating-navbar): a full-width bar at the top that
// becomes a frosted floating pill once the page scrolls, slides away while scrolling down and comes
// back on any scroll up (useScroll + useMotionValueEvent, transform/opacity only). One underline
// slides to the hovered or active link. From 1280px the full menu fits on one line; below that it
// collapses into the burger menu. Every menu route is prefetched when the browser is idle, so clicks
// open the next page at once.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { m, useMotionValueEvent, useScroll } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import { SERVICES } from "@/data/services";
import { SEO_AUDIT_TOOL, TOOLS } from "@/data/tools";
import { SOLUTIONS_LINK } from "@/data/solutions";
import BookCall from "./BookCall";
import { trackEvent } from "@/lib/analytics";
import "../styles/SiteHeader.css";

const NAV: { href: string; label: string; badge?: string }[] = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: SEO_AUDIT_TOOL.href, label: "Free SEO Audit", badge: "Free" },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

type LinkProps = { href: string; className?: string; children: React.ReactNode; pathname: string; onNavigate: () => void };

const NavLink = ({ href, className, children, pathname, onNavigate }: LinkProps) => (
  <Link
    href={href}
    className={className}
    aria-current={isActive(pathname, href) ? "page" : undefined}
    onClick={(e) => {
      if (href === SEO_AUDIT_TOOL.href) trackEvent("audit_cta_click", { location: "nav" });
      onNavigate();
      e.currentTarget.blur(); // lets the hover/focus dropdown close after a click
    }}
  >
    {children}
  </Link>
);

// useLayoutEffect on the client only (no warning during server rendering).
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const SiteHeader = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const router = useRouter();
  const { scrollY } = useScroll();
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);

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

  // Floating pill once scrolled; hidden while scrolling down, shown again on any scroll up.
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 12);
    if (y < 140) setHidden(false);
    else if (Math.abs(y - prev) > 2) setHidden(y > prev);
  });
  useEffect(() => {
    setScrolled(window.scrollY > 12);
    setHidden(false);
  }, [pathname]);

  // Prefetch every menu route once the browser is idle (links in the closed dropdown and mobile menu
  // are not in the viewport, so next/link alone would not prefetch them).
  useEffect(() => {
    const hrefs = ["/", "/services", ...SERVICES.map((s) => `/services/${s.slug}`), SOLUTIONS_LINK.href, ...TOOLS.map((t) => t.href), ...NAV.map((n) => n.href), "/contact", "/hire"];
    const go = () => hrefs.forEach((h) => router.prefetch(h));
    const id = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(go, { timeout: 3000 }) : window.setTimeout(go, 1500);
    return () => (typeof window.cancelIdleCallback === "function" ? window.cancelIdleCallback(id as number) : window.clearTimeout(id as number));
  }, [router]);

  // Sliding underline: moves (transform only) to the hovered link, or back to the active one.
  const moveLine = useCallback((el: HTMLElement | null) => {
    const line = lineRef.current;
    const nav = navRef.current;
    if (!line || !nav) return;
    if (!el) {
      line.style.opacity = "0";
      return;
    }
    const n = nav.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    line.style.opacity = "1";
    line.style.transform = `translateX(${r.left - n.left + 14}px) scaleX(${Math.max(r.width - 28, 8) / 100})`;
  }, []);
  const activeLink = useCallback(() => navRef.current?.querySelector<HTMLElement>(".is-active") ?? null, []);
  useIsoLayoutEffect(() => moveLine(activeLink()), [pathname, moveLine, activeLink]);
  useEffect(() => {
    const onResize = () => moveLine(activeLink());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [moveLine, activeLink]);

  const link = { pathname, onNavigate: () => setOpen(false) };
  const cls = (href: string) => (isActive(pathname, href) ? "is-active" : "");
  // "Let's talk": the same booking action as every "Book a free call" button (Calendly or /contact).
  const book = <BookCall bare label="Let's talk" className="site-cta" onClick={() => setOpen(false)} icon={<span className="site-cta-dot" aria-hidden="true" />} />;
  const hover = (e: React.SyntheticEvent<HTMLElement>) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>(".site-nav > a, .site-nav-services");
    if (target) moveLine(target);
  };

  return (
    <m.header
      className={`site-header${scrolled ? " is-scrolled" : ""}`}
      initial={false}
      animate={{ y: hidden && !open ? "-130%" : "0%", opacity: hidden && !open ? 0 : 1 }}
      transition={{ duration: 0.2 }}
      onFocusCapture={() => setHidden(false)}
    >
      <div className="site-header-inner">
        <Link href="/" className="site-logo" title="Home">
          <span className="site-mark" aria-hidden="true" />
          <span className="site-name">{SITE.name}</span>
        </Link>

        <nav
          className="site-nav"
          aria-label="Primary"
          ref={navRef}
          onMouseOver={hover}
          onFocus={hover}
          onMouseLeave={() => moveLine(activeLink())}
          onBlur={() => moveLine(activeLink())}
        >
          <div className="site-nav-drop">
            <NavLink {...link} href="/services" className={`site-nav-services ${cls("/services")}`}>
              Services
            </NavLink>
            <div className="site-nav-menu">
              <div className="site-nav-col">
                <p className="site-nav-heading">Services</p>
                {SERVICES.map((s) => (
                  <NavLink {...link} key={s.slug} href={`/services/${s.slug}`} className={cls(`/services/${s.slug}`)}>
                    <strong>{s.name}</strong>
                    <span>{s.summary}</span>
                  </NavLink>
                ))}
              </div>
              <div className="site-nav-col is-side">
                <p className="site-nav-heading">By industry</p>
                <NavLink {...link} href={SOLUTIONS_LINK.href} className={cls(SOLUTIONS_LINK.href)}>
                  <strong>{SOLUTIONS_LINK.name}</strong>
                  <span>{SOLUTIONS_LINK.summary}</span>
                </NavLink>
                <p className="site-nav-heading">Free tools</p>
                {TOOLS.map((t) => (
                  <NavLink {...link} key={t.href} href={t.href} className={cls(t.href)}>
                    <strong>{t.name}</strong>
                    <span>{t.summary}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
          {NAV.map((n) => (
            <NavLink {...link} key={n.href} href={n.href} className={`${cls(n.href)}${n.badge ? " site-nav-audit" : ""}`}>
              {n.label}
              {n.badge && <span className="site-badge">{n.badge}</span>}
            </NavLink>
          ))}
          <span className="site-nav-line" ref={lineRef} aria-hidden="true" />
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
              <NavLink {...link} href="/" className={pathname === "/" ? "is-active" : ""}>
                Home
              </NavLink>
              <NavLink {...link} href="/services" className={cls("/services")}>
                Services
              </NavLink>
              {SERVICES.map((s) => (
                <NavLink {...link} key={s.slug} href={`/services/${s.slug}`} className={`is-sub ${cls(`/services/${s.slug}`)}`}>
                  {s.name}
                </NavLink>
              ))}
              <NavLink {...link} href={SOLUTIONS_LINK.href} className={`is-sub ${cls(SOLUTIONS_LINK.href)}`}>
                {SOLUTIONS_LINK.name}
              </NavLink>
              {TOOLS.map((t) => (
                <NavLink {...link} key={t.href} href={t.href} className={`is-sub ${cls(t.href)}`}>
                  {t.name}
                </NavLink>
              ))}
              {NAV.map((n) => (
                <NavLink {...link} key={n.href} href={n.href} className={cls(n.href)}>
                  {n.label}
                  {n.badge && <span className="site-badge">{n.badge}</span>}
                </NavLink>
              ))}
              <NavLink {...link} href="/contact" className={cls("/contact")}>
                Contact
              </NavLink>
              <NavLink {...link} href="/hire" className={cls("/hire")}>
                Hire me
              </NavLink>
              {book}
            </div>
          )}
        </div>
      </div>
    </m.header>
  );
};

export default SiteHeader;
