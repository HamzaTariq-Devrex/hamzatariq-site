"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Outer element (clips the track); gets "is-looping" once the copy exists. */
  className: string;
  /** The moving track that holds the items. */
  trackClassName: string;
  /** Class of the cloned copy appended inside the track. */
  copyClassName: string;
  /** Pixels per second; negative values scroll to the right. */
  speed?: number;
  /** Drag to scroll (mouse or touch); a drag never triggers a click. */
  draggable?: boolean;
  /** Custom cursor label over the marquee (see src/components/motion/Cursor.tsx). */
  cursorLabel?: string;
  children: React.ReactNode;
};

/**
 * Infinite marquee for server-rendered items. After load it clones the items into a copy (aria-hidden,
 * inert, links out of the tab order) for a seamless loop, then moves the track with one rAF loop
 * (transform only): pauses on hover, can be dragged, stops off-screen and in hidden tabs. With reduced
 * motion there is no copy and no movement; the items stay a static row (CSS wraps them).
 */
const Marquee = ({ className, trackClassName, copyClassName, speed = 40, draggable = false, cursorLabel, children }: Props) => {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = outer.current;
    const el = track.current;
    if (!box || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const copy = document.createElement("div");
    copy.className = copyClassName;
    copy.setAttribute("aria-hidden", "true");
    copy.inert = true;
    for (const child of [...el.children]) copy.appendChild(child.cloneNode(true));
    copy.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    el.appendChild(copy);
    box.classList.add("is-looping");

    let offset = 0;
    let last = performance.now();
    let raf = 0;
    let hovered = false;
    let visible = true;
    let dragging = false;
    let dragX = 0;
    let moved = 0;

    const loopLength = () => copy.offsetLeft || el.scrollWidth / 2;
    const wrap = () => {
      const L = loopLength();
      if (!L) return;
      offset = ((offset % L) + L) % L;
      offset = offset > 0 ? offset - L : offset;
    };
    const frame = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      if (!hovered && !dragging) offset -= speed * dt;
      wrap();
      el.style.transform = `translate3d(${offset}px, 0, 0)`;
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(box);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    const onEnter = () => (hovered = true);
    const onLeave = () => (hovered = false);
    box.addEventListener("pointerenter", onEnter);
    box.addEventListener("pointerleave", onLeave);

    const onDown = (e: PointerEvent) => {
      if (!draggable || (e.pointerType === "mouse" && e.button !== 0)) return;
      dragging = true;
      dragX = e.clientX;
      moved = 0;
      box.setPointerCapture(e.pointerId);
      box.classList.add("is-dragging");
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragX;
      dragX = e.clientX;
      moved += Math.abs(dx);
      offset += dx;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      box.releasePointerCapture?.(e.pointerId);
      box.classList.remove("is-dragging");
    };
    // A drag is not a click: swallow the click that ends a drag.
    const onClick = (e: MouseEvent) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
      moved = 0;
    };
    box.addEventListener("pointerdown", onDown);
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerup", onUp);
    box.addEventListener("pointercancel", onUp);
    box.addEventListener("click", onClick, true);

    start();
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      box.removeEventListener("pointerenter", onEnter);
      box.removeEventListener("pointerleave", onLeave);
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onUp);
      box.removeEventListener("click", onClick, true);
      copy.remove();
      el.style.transform = "";
      box.classList.remove("is-looping");
    };
  }, [copyClassName, speed, draggable]);

  return (
    <div ref={outer} className={className} data-cursor-label={cursorLabel} style={draggable ? { touchAction: "pan-y" } : undefined}>
      <div ref={track} className={trackClassName}>
        {children}
      </div>
    </div>
  );
};

export default Marquee;
