"use client";

import { useEffect, useRef } from "react";
import "./Cursor.css";

/**
 * Custom cursor (mouse only): a small dot that follows the pointer and grows into a circle with a
 * label over elements marked data-cursor-label="View|Read|Drag". Transform/opacity only, one rAF
 * loop. Never rendered on touch screens or for reduced motion; the native cursor always stays.
 */
const Cursor = () => {
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = dot.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.remove();
      return;
    }
    let x = -100;
    let y = -100;
    let cx = -100;
    let cy = -100;
    let raf = 0;
    let active = "";

    const tick = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.1 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      el.classList.add("is-on");
      const target = (e.target as Element | null)?.closest?.<HTMLElement>("[data-cursor-label]");
      const next = target?.dataset.cursorLabel ?? "";
      if (next !== active) {
        active = next;
        if (label.current) label.current.textContent = next;
        el.classList.toggle("is-big", !!next);
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => el.classList.remove("is-on");
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="cursor" ref={dot} aria-hidden="true">
      <span className="cursor-ring">
        <span className="cursor-label" ref={label} />
      </span>
    </div>
  );
};

export default Cursor;
