import Image from "next/image";
import { SITE } from "@/lib/site";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HoverLinks from "./HoverLinks";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import "./styles/Navbar.css";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);
export let smoother: ScrollSmoother;

const EMAIL = "hamzabuildsweb@gmail.com";
const LINKS = [
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
];
const SECTION_MAP: [string, string | null][] = [
  [".landing-section", null],
  ["#about", "about"],
  [".whatIDO", "services"],
  [".career-section", "about"],
  ["#work", "work"],
  ["#contact", "contact"],
];

const Navbar = () => {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.7,
      speed: 1.7,
      effects: true,
      autoResize: true,
      ignoreMobileResize: true,
    });

    smoother.scrollTop(0);
    smoother.paused(true);

    const onResize = () => ScrollSmoother.refresh(true);
    window.addEventListener("resize", onResize);

    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 400 && y > lastY + 4 ? true : y < lastY - 4 ? false : (h) => h);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const match = SECTION_MAP.find(([sel]) => entry.target.matches(sel));
          if (match) setActive(match[1]);
        });
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );
    SECTION_MAP.forEach(([sel]) => {
      const el = document.querySelector(sel);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;
    const target = list.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!target) {
      indicator.style.opacity = "0";
      return;
    }
    indicator.style.opacity = "1";
    indicator.style.width = `${target.offsetWidth}px`;
    indicator.style.transform = `translateX(${target.offsetLeft}px)`;
  }, [active]);

  useEffect(() => {
    if (!smoother) return;
    if (menuOpen) {
      smoother.paused(true);
      document.body.style.overflowY = "hidden";
    } else if (document.querySelector("main.main-active")) {
      smoother.paused(false);
      document.body.style.overflowY = "auto";
    }
  }, [menuOpen]);

  const goTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    setMenuOpen(false);
    if (window.innerWidth > 1024) {
      e.preventDefault();
      smoother.scrollTo(`#${id}`, true, "top top");
    }
  };

  return (
    <>
      <header
        className={`header ${scrolled ? "is-scrolled" : ""} ${
          hidden && !menuOpen ? "is-hidden" : ""
        } ${menuOpen ? "is-menu-open" : ""}`}
      >
        <a href="/#" className="navbar-title" data-cursor="disable" aria-label="Home">
          <Image
            src={SITE.logo}
            alt="Hamza Tariq"
            className="navbar-logo"
            width={779}
            height={320}
            priority
          />
        </a>

        <nav className="navbar-pill" aria-label="Primary">
          <span className="navbar-indicator" ref={indicatorRef} aria-hidden="true" />
          <ul ref={listRef}>
            {LINKS.map((link) => (
              <li key={link.id} data-id={link.id}>
                <a
                  href={`#${link.id}`}
                  className={active === link.id ? "is-active" : ""}
                  onClick={(e) => goTo(e, link.id)}
                >
                  <HoverLinks text={link.label.toUpperCase()} />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a href={`mailto:${EMAIL}`} className="navbar-connect" data-cursor="disable">
          <span className="navbar-status" aria-hidden="true" />
          <span className="navbar-connect-text">{EMAIL}</span>
          <span className="navbar-connect-short">Let's talk</span>
        </a>

        <button
          type="button"
          className="navbar-burger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </header>

      <div className={`navbar-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <ul>
          {LINKS.map((link, i) => (
            <li key={link.id} style={{ transitionDelay: menuOpen ? `${0.1 + i * 0.06}s` : "0s" }}>
              <a href={`#${link.id}`} onClick={(e) => goTo(e, link.id)} tabIndex={menuOpen ? 0 : -1}>
                <small>0{i + 1}</small>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={`mailto:${EMAIL}`}
          className="navbar-menu-email"
          tabIndex={menuOpen ? 0 : -1}
        >
          <span className="navbar-status" aria-hidden="true" />
          {EMAIL}
        </a>
      </div>

      <div className="landing-circle1"></div>
      <div className="landing-circle2"></div>
      <div className="nav-fade"></div>
    </>
  );
};

export default Navbar;
