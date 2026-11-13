"use client";

// Two rows of large type that run in opposite directions and speed up (and lean) with the scroll
// velocity. Framer Motion: useScroll → useVelocity → useSpring, moved in useAnimationFrame with
// transforms only, and only while the band is near the screen. With reduced motion the rows stand still. Decorative: the words repeat content
// that is already on the page, so the band is hidden from assistive tech.
import { useRef } from "react";
import { m, useAnimationFrame, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";

type RowProps = { words: string[]; base: number; outline?: boolean; active: boolean };

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

const Row = ({ words, base, outline = false, active }: RowProps) => {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [0, 1000], [0, 5], { clamp: false });
  const skew = useTransform(velocity, [-2000, 2000], [8, -8]);
  const dir = useRef(1);
  // Four copies in the row: moving by one copy (25%) loops without a seam.
  const tx = useTransform(x, (v) => `${wrap(-25, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduce || !active) return;
    const f = factor.get();
    if (f < 0) dir.current = -1;
    else if (f > 0) dir.current = 1;
    x.set(x.get() + dir.current * base * (delta / 1000) * (1 + Math.abs(f)));
  });

  return (
    <div className={`vband-row${outline ? " is-outline" : ""}`}>
      <m.div className="vband-track" style={reduce ? undefined : { x: tx, skewX: skew }}>
        {[0, 1, 2, 3].map((copy) => (
          <span key={copy} className="vband-copy">
            {words.map((w) => (
              <span key={w} className="vband-word">
                {w}
                <i aria-hidden="true" />
              </span>
            ))}
          </span>
        ))}
      </m.div>
    </div>
  );
};

const VelocityBand = ({ top, bottom }: { top: string[]; bottom: string[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  // The rows only move while the band is near the screen.
  const active = useInView(ref, { margin: "200px 0px" });
  return (
    <div className="vband" aria-hidden="true" data-motion="self" ref={ref}>
      <Row words={top} base={-2.2} active={active} />
      <Row words={bottom} base={2.2} outline active={active} />
    </div>
  );
};

export default VelocityBand;
