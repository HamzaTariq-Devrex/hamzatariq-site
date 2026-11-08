"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fades and slides `[data-reveal]` elements in as they scroll into view (mounted once in SiteShell).
 * Content is visible without JavaScript and with reduced motion: elements are only hidden after this
 * runs, and anything already on screen is marked visible first, so nothing above the fold flickers.
 */
const Reveal = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // [data-stagger]: its children reveal one after another (70ms apart).
    document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((group) => {
      [...group.children].forEach((child, i) => {
        const el = child as HTMLElement;
        if (el.hasAttribute("data-reveal")) return;
        el.setAttribute("data-reveal", "");
        el.style.transitionDelay = `${Math.min(i, 8) * 70}ms`;
      });
    });
    const items = [...document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)")];
    const inView = (el: HTMLElement) => el.getBoundingClientRect().top < window.innerHeight * 0.92;
    // Stagger delays only apply to the reveal; cleared afterwards so hover effects stay instant.
    const show = (el: HTMLElement) => {
      el.classList.add("is-in");
      if (el.style.transitionDelay) window.setTimeout(() => (el.style.transitionDelay = ""), 1300);
    };
    items.filter(inView).forEach(show);
    document.documentElement.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    items.filter((el) => !el.classList.contains("is-in")).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
};

export default Reveal;
