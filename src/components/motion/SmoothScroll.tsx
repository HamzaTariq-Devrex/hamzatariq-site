"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Lenis smooth scrolling for the whole site (mouse wheel and trackpad; native touch scrolling stays).
 * Off for reduced motion. Scrollable panels (chat, mobile menu, dropdowns, admin) keep native
 * scrolling. Navigation is never delayed: on a route change Lenis drops any running scroll and jumps
 * to the top before the new page paints (or to the #anchor), so it can't pull the page back.
 */
let lenis: Lenis | null = null;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const SmoothScroll = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lenis = new Lenis({
      autoRaf: true,
      lerp: 0.11,
      anchors: { offset: -96 },
      prevent: (node) => !!node.closest?.(".ai-chat-panel, .site-mobile-panel, .site-nav-menu, .adm-shell, dialog, [data-lenis-prevent]"),
    });
    return () => {
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  useIsoLayoutEffect(() => {
    if (!lenis) return;
    lenis.stop();
    if (!window.location.hash) lenis.scrollTo(0, { immediate: true, force: true });
    lenis.start();
    lenis.resize();
  }, [pathname]);

  return null;
};

export default SmoothScroll;
