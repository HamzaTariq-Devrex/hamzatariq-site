"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Lenis smooth scrolling for the whole site (mouse wheel and trackpad; native touch scrolling stays).
 * Off for reduced motion. Scrollable panels (chat, mobile menu, dropdowns, admin) keep native
 * scrolling. Scrolls to the top on every route change, and handles #anchor links.
 */
let lenis: Lenis | null = null;

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

  useEffect(() => {
    if (!window.location.hash) lenis?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
};

export default SmoothScroll;
