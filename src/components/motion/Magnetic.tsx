"use client";

import { useEffect, useRef } from "react";

/**
 * Pulls its child a few pixels toward the pointer (primary buttons). Transform only; off on touch
 * screens and for reduced motion. The spring (stiffness 260, damping 18, mass 0.4) runs in a small
 * rAF loop of its own, so this needs no animation library and adds nothing to the first load.
 */
const SPRING = { k: 260, c: 18, m: 0.4 };

const Magnetic = ({ children, strength = 0.22, className = "" }: { children: React.ReactNode; strength?: number; className?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const state = useRef({ tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0, raf: 0, last: 0 });

  useEffect(() => {
    const s = state.current;
    return () => cancelAnimationFrame(s.raf);
  }, []);

  const step = (now: number) => {
    const s = state.current;
    const el = ref.current;
    if (!el) return;
    const dt = Math.min(0.032, (now - (s.last || now)) / 1000) || 1 / 60;
    s.last = now;
    const ax = (-SPRING.k * (s.x - s.tx) - SPRING.c * s.vx) / SPRING.m;
    const ay = (-SPRING.k * (s.y - s.ty) - SPRING.c * s.vy) / SPRING.m;
    s.vx += ax * dt;
    s.vy += ay * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    const done = Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) < 0.05 && Math.abs(s.vx) + Math.abs(s.vy) < 0.05;
    if (done) {
      s.x = s.tx;
      s.y = s.ty;
      s.vx = s.vy = 0;
    }
    el.style.transform = s.x || s.y ? `translate3d(${s.x}px, ${s.y}px, 0)` : "";
    s.raf = done ? 0 : requestAnimationFrame(step);
  };

  const target = (x: number, y: number) => {
    const s = state.current;
    s.tx = x;
    s.ty = y;
    if (!s.raf) {
      s.last = 0;
      s.raf = requestAnimationFrame(step);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = ref.current.getBoundingClientRect();
    // Measure without the current offset, so the pull is relative to the button's resting place.
    const s = state.current;
    target((e.clientX - (r.left - s.x + r.width / 2)) * strength, (e.clientY - (r.top - s.y + r.height / 2)) * strength);
  };

  return (
    <span ref={ref} className={`magnetic ${className}`.trim()} style={{ display: "inline-flex" }} onPointerMove={onMove} onPointerLeave={() => target(0, 0)}>
      {children}
    </span>
  );
};

export default Magnetic;
