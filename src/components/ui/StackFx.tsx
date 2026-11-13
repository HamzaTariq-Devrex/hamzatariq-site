"use client";

// Stacking cards: the list items are `position: sticky` (CSS), so each card pins under the header and
// the next one slides over it. This adds the depth: while the next card arrives, the covered card
// scales back a little and its shade fades in (Framer Motion `scroll` + `animate`, transform and
// opacity only). Only where the cards actually stick (desktop, tall enough screen, motion allowed).
import { useEffect, useRef } from "react";
import { animate, scroll } from "framer-motion";

export const STACK_QUERY = "(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)";

const StackFx = ({ className = "", children }: { className?: string; children: React.ReactNode }) => {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list || !window.matchMedia(STACK_QUERY).matches) return;
    const cards = [...list.children] as HTMLElement[];
    const stops: (() => void)[] = [];
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      const inner = card.firstElementChild as HTMLElement | null;
      const shade = card.querySelector<HTMLElement>(".sstack-shade");
      if (!next || !inner) return;
      const depth = cards.length - 1 - i;
      const range: Parameters<typeof scroll>[1] = { target: next, offset: ["start end", "start 0.2"] };
      stops.push(scroll(animate(inner, { scale: [1, 1 - depth * 0.035] }, { ease: "linear" }), range));
      if (shade) stops.push(scroll(animate(shade, { opacity: [0, 0.62] }, { ease: "linear" }), range));
    });
    return () => stops.forEach((s) => s());
  }, []);

  return (
    <ol className={className} ref={ref} data-motion="self">
      {children}
    </ol>
  );
};

export default StackFx;
