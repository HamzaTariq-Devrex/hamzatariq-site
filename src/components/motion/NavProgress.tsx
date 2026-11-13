"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Instant feedback for internal link clicks: a thin accent bar starts at the top of the screen on
 * pointer down (before the click even fires) and completes when the new route renders. Pure
 * transform/opacity on one element; never blocks or delays navigation.
 */
const isInternalNav = (e: MouseEvent | PointerEvent) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || a.target === "_blank" || a.hasAttribute("download")) return false;
  const url = new URL(a.href, window.location.href);
  return url.origin === window.location.origin && url.pathname !== window.location.pathname && !url.pathname.startsWith("/api");
};

const NavProgress = () => {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const timer = useRef(0);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = bar.current;
      if (!el || !isInternalNav(e)) return;
      window.clearTimeout(timer.current);
      el.className = "nav-progress is-start";
      requestAnimationFrame(() => el.classList.add("is-going"));
      // Released without navigating (drag, cancelled click): hide again.
      timer.current = window.setTimeout(() => (el.className = "nav-progress"), 8000);
    };
    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", onDown, { capture: true });
  }, []);

  useEffect(() => {
    const el = bar.current;
    if (!el || !el.classList.contains("is-start")) return;
    window.clearTimeout(timer.current);
    el.className = "nav-progress is-start is-going is-done";
    timer.current = window.setTimeout(() => (el.className = "nav-progress"), 380);
  }, [pathname]);

  return <div ref={bar} className="nav-progress" aria-hidden="true" />;
};

export default NavProgress;
