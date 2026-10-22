"use client";

import { useEffect, type RefObject } from "react";

export const useCardReveal = (container: RefObject<HTMLElement | null>, deps: unknown[]) => {
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" }
    );
    root.querySelectorAll(".project-card:not(.is-in)").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
