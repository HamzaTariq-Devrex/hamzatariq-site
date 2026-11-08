"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fades and slides `[data-reveal]` elements in as they scroll into view (mounted once in SiteShell).
 * Content is visible without JavaScript and with reduced motion: elements are only hidden after this
 * runs, and anything already on screen is marked visible first, so nothing above the fold flickers.
 */
// Big headings below the fold reveal line by line (masked slide-up). Words are wrapped in masks and
// grouped into lines by their position; headings on screen at load are left alone (no LCP delay).
const LINE_TARGETS = ".x-h2, .statement, .page-cta h2, .services-row h3, [data-lines]";

const splitLines = (el: HTMLElement) => {
  if (el.dataset.split) return;
  el.dataset.split = "1";
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const node of texts) {
    const parts = node.data.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const mask = document.createElement("span");
      mask.className = "ln";
      const inner = document.createElement("span");
      inner.className = "ln-in";
      inner.textContent = part;
      mask.appendChild(inner);
      frag.appendChild(mask);
    }
    node.replaceWith(frag);
  }
  let line = -1;
  let top = -Infinity;
  el.querySelectorAll<HTMLElement>(".ln").forEach((mask) => {
    if (mask.offsetTop > top + 4) {
      line += 1;
      top = mask.offsetTop;
    }
    (mask.firstChild as HTMLElement).style.setProperty("--ln", String(line));
  });
  el.classList.add("lines-ready");
};

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
    const inView = (el: HTMLElement) => el.getBoundingClientRect().top < window.innerHeight * 0.92;
    document.querySelectorAll<HTMLElement>(LINE_TARGETS).forEach((el) => {
      if (!el.dataset.split && !inView(el)) {
        splitLines(el);
        el.setAttribute("data-reveal-lines", "");
      }
    });
    const items = [...document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in), [data-reveal-lines]:not(.is-in)")];
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
