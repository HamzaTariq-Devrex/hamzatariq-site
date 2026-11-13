"use client";

import { useEffect, useRef } from "react";

// Cards that light up under the pointer (the glow itself is CSS in Theme.css, reading --mx / --my).
const GLOW =
  ".bento-item, .stat, .tool-tile, .x-card, .x-price-card, .x-panel, .x-stat, .post-card, .review-card, .trust-card, .work-tile, .project-pager-link";

/**
 * Two small page-wide effects, one passive listener each:
 * - a thin gradient line down the right edge that fills with the scroll position;
 * - the pointer position written to the hovered card as --mx / --my (mouse only).
 * Transform and custom properties only. Both are off for reduced motion.
 */
const AmbientFx = () => {
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = bar.current;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (el) el.style.transform = `scaleY(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const card = (e.target as Element | null)?.closest?.<HTMLElement>(GLOW);
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    paint();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <span className="scroll-line" aria-hidden="true">
      <span ref={bar} />
    </span>
  );
};

export default AmbientFx;
