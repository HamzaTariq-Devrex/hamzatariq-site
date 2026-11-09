"use client";

// Infinite Moving Cards, ported from Aceternity UI (ui.aceternity.com/components/infinite-moving-cards):
// a row of cards that scrolls forever (CSS animation over the cards plus one clone of each), with
// faded edges and a pause on hover. Adapted: the cards are server-rendered children (<li>), the clones
// are hidden from screen readers and inert (no duplicate links in the tab order), and with reduced
// motion nothing is cloned and the row wraps into a grid. CSS in Ui.css (`.imc`).
import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
  "aria-label"?: string;
};

const DURATION = { fast: "20s", normal: "40s", slow: "80s" };

const InfiniteMovingCards = ({ children, direction = "left", speed = "normal", pauseOnHover = true, className = "", ...rest }: Props) => {
  const scroller = useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const ul = scroller.current;
    if (!ul || ul.dataset.cloned || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ul.dataset.cloned = "1";
    for (const item of Array.from(ul.children)) {
      const copy = item.cloneNode(true) as HTMLElement;
      copy.setAttribute("aria-hidden", "true");
      copy.setAttribute("inert", "");
      copy.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      ul.appendChild(copy);
    }
    setStart(true);
  }, []);

  return (
    <div
      className={`imc ${className}`.trim()}
      style={{ "--imc-duration": DURATION[speed], "--imc-direction": direction === "left" ? "forwards" : "reverse" } as React.CSSProperties}
      aria-label={rest["aria-label"]}
    >
      <ul ref={scroller} className={`imc-list${start ? " is-running" : ""}${pauseOnHover ? " is-pausable" : ""}`}>
        {children}
      </ul>
    </div>
  );
};

export default InfiniteMovingCards;
