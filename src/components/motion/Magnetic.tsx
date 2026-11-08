"use client";

import { useRef } from "react";
import { m, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/**
 * Pulls its child a few pixels toward the pointer (primary buttons). Transform only; off on touch
 * screens and for reduced motion.
 */
const Magnetic = ({ children, strength = 0.22, className = "" }: { children: React.ReactNode; strength?: number; className?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 });

  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <m.span ref={ref} className={`magnetic ${className}`.trim()} style={{ x, y, display: "inline-flex" }} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </m.span>
  );
};

export default Magnetic;
