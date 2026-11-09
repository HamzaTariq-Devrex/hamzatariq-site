"use client";

// Mounts the scroll-motion engine (revealEngine.ts) on every page. The engine's code (and Framer
// Motion's DOM animation API it uses) is loaded only when the browser is idle after the page has
// painted, so it never adds to the first load or delays a navigation.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Stop } from "./revealEngine";

const Reveal = () => {
  const pathname = usePathname();

  // Every page (first load and client-side navigations): set up after the page has painted, so the
  // engine never delays a navigation. What is already on screen stays as it is (no flash, no LCP
  // delay); everything below the fold animates in as it is scrolled to.
  useEffect(() => {
    let stops: Stop[] = [];
    let cancelled = false;
    const start = () =>
      void import("./revealEngine").then(({ run }) => {
        if (!cancelled) stops = run(true);
      });
    const id =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(start, { timeout: 300 })
        : window.setTimeout(start, 120);
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id as number);
      else window.clearTimeout(id as number);
      stops.forEach((s) => s());
    };
  }, [pathname]);

  return null;
};

export default Reveal;
