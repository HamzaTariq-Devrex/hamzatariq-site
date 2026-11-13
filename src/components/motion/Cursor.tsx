"use client";

import { useEffect, useRef } from "react";
import "./Cursor.css";

/**
 * Custom cursor (mouse only), drawn on top of the native pointer, which always stays:
 * - a small dot that sits on the pointer;
 * - a glowing ring that trails it smoothly and, over links and buttons, opens up with a soft violet
 *   tint; it presses in while the mouse button is down and steps aside over text fields;
 * - over elements marked data-cursor-label="View|Read|Drag" the ring becomes a filled bubble with the
 *   label.
 * Transform/opacity only, one rAF loop that stops when the cursor is at rest. Never shown on touch
 * screens or for reduced motion.
 */
const INTERACTIVE = "a[href], button, [role='button'], summary, label[for], select, .page-btn, [data-cursor]";
const TEXT =
  "input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='submit']):not([type='button']), textarea, [contenteditable='true']";

const Cursor = () => {
  const root = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const d = dot.current;
    const r = ring.current;
    if (!el || !d || !r) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Hide, never remove: React owns this node (removing it breaks the next page navigation).
      el.style.display = "none";
      return;
    }
    let x = -100;
    let y = -100;
    let dx = -100;
    let dy = -100;
    let rx = -100;
    let ry = -100;
    let raf = 0;
    let mode = "";
    let text = "";

    const tick = () => {
      dx += (x - dx) * 0.55;
      dy += (y - dy) * 0.55;
      rx += (x - rx) * 0.17;
      ry += (y - ry) * 0.17;
      d.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      r.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.1 ? requestAnimationFrame(tick) : 0;
    };
    const setMode = (next: string, nextText: string) => {
      if (next !== mode) {
        if (mode) el.classList.remove(`is-${mode}`);
        if (next) el.classList.add(`is-${next}`);
        mode = next;
      }
      if (nextText !== text) {
        text = nextText;
        if (label.current) label.current.textContent = nextText;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      el.classList.add("is-on");
      const t = e.target as Element | null;
      const labelled = t?.closest?.<HTMLElement>("[data-cursor-label]");
      if (labelled) setMode("big", labelled.dataset.cursorLabel ?? "");
      else if (t?.closest?.(TEXT)) setMode("text", "");
      else if (t?.closest?.(INTERACTIVE)) setMode("hover", "");
      else setMode("", "");
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") el.classList.add("is-down");
    };
    const onUp = () => el.classList.remove("is-down");
    const onLeave = () => el.classList.remove("is-on", "is-down");
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="cursor" ref={root} aria-hidden="true">
      <span className="cursor-follow" ref={ring}>
        <span className="cursor-outline" />
        <span className="cursor-bubble">
          <span className="cursor-label" ref={label} />
        </span>
      </span>
      <span className="cursor-dot" ref={dot} />
    </div>
  );
};

export default Cursor;
