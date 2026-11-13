"use client";

import { useEffect } from "react";

/**
 * Marks the "On this page" link of the section being read (`is-current` on `.post-toc a`): the last
 * heading whose top has passed 35% of the viewport. Recomputed from positions on every scroll frame,
 * so jumps (anchor links, Home/End) never leave a stale mark. Renders nothing.
 */
const TocSpy = () => {
  useEffect(() => {
    const links = new Map<string, HTMLAnchorElement>();
    document.querySelectorAll<HTMLAnchorElement>(".post-toc a[href^='#']").forEach((a) => links.set(a.hash.slice(1), a));
    const heads = [...document.querySelectorAll<HTMLElement>(".post-body h2[id], .post-body section[id]")].filter((h) => links.has(h.id));
    if (!heads.length) return;
    let frame = 0;
    const mark = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const h of heads) if (h.getBoundingClientRect().top <= line) current = h.id;
      links.forEach((a, id) => a.classList.toggle("is-current", id === current));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(mark);
    };
    mark();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return null;
};

export default TocSpy;
