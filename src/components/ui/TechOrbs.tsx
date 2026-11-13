"use client";

// Tech stack as glossy balls with simple physics (About page): they fly in from both sides when the
// section comes into view, gather in a loose cluster, bump into each other and scatter away from the
// pointer; a ball can be thrown by dragging it. Each ball carries the tool's logo, which leans with
// the ball's speed for a 3D feel. Hand-written physics (spring to the centre, circle collisions,
// pointer push), DOM elements moved with transforms only, one rAF loop that runs only while the stage
// is on screen.
// Without JavaScript, or with reduced motion, the same list is a tidy static row of balls (CSS).
import { useEffect, useRef, useState } from "react";

export type Orb = { name: string; use: string; icon: React.ReactNode };

type Body = { el: HTMLElement; logo: HTMLElement | null; x: number; y: number; vx: number; vy: number; r: number };

// Relative ball sizes (repeats for longer lists).
const SIZES = [1, 0.82, 0.9, 0.74, 0.86, 0.7, 0.94, 0.78];

const TechOrbs = ({ items }: { items: Orb[] }) => {
  const stage = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState<Orb | null>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = [...el.children] as HTMLElement[];
    let w = el.clientWidth;
    let h = 0;
    let bodies: Body[] = [];
    let raf = 0;
    let visible = false;
    let started = false;
    const pointer = { x: -9999, y: -9999, on: false };
    let drag: { b: Body; px: number; py: number; t: number } | null = null;

    const layout = () => {
      w = el.clientWidth;
      const base = Math.max(46, Math.min(92, w / 9.5));
      h = Math.round(Math.max(360, Math.min(560, base * 6.2)));
      el.style.height = `${h}px`;
      bodies = nodes.map((node, i) => {
        const r = Math.round(base * SIZES[i % SIZES.length]);
        node.style.width = node.style.height = `${r * 2}px`;
        const old = bodies[i];
        const side = i % 2 ? 1 : -1;
        return {
          el: node,
          logo: node.querySelector<HTMLElement>(".orb-face"),
          r,
          // First time: parked outside the stage, left and right alternately.
          x: old ? Math.min(Math.max(old.x, r), w - r) : w / 2 + side * (w / 2 + r * 2 + i * 40),
          y: old ? Math.min(Math.max(old.y, r), h - r) : h * (0.25 + 0.5 * ((i * 0.37) % 1)),
          vx: old ? old.vx : -side * (16 + i * 1.5),
          vy: old ? old.vy : (i % 3) - 1,
        };
      });
    };

    const step = (now: number) => {
      raf = 0;
      if (!visible) return;
      const cx = w / 2;
      const cy = h / 2;
      for (const b of bodies) {
        if (drag?.b === b) continue;
        // Pull towards the centre, a slow drift so the cluster never freezes, and the pointer push.
        b.vx += (cx - b.x) * 0.0016 + Math.sin(now / 1700 + b.r) * 0.012;
        b.vy += (cy - b.y) * 0.0024 + Math.cos(now / 2100 + b.r * 2) * 0.012;
        if (pointer.on) {
          const dx = b.x - pointer.x;
          const dy = b.y - pointer.y;
          const d = Math.hypot(dx, dy) || 1;
          const reach = b.r + 110;
          if (d < reach) {
            const f = ((reach - d) / reach) * 1.5;
            b.vx += (dx / d) * f;
            b.vy += (dy / d) * f;
          }
        }
        b.vx *= 0.965;
        b.vy *= 0.965;
        b.x += b.vx;
        b.y += b.vy;
      }
      // Circle collisions: push apart and trade speed along the contact line.
      for (let i = 0; i < bodies.length; i += 1) {
        for (let j = i + 1; j < bodies.length; j += 1) {
          const a = bodies[i];
          const b = bodies[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const min = a.r + b.r + 2;
          if (d >= min) continue;
          const nx = dx / d;
          const ny = dy / d;
          const push = (min - d) / 2;
          const aFixed = drag?.b === a;
          const bFixed = drag?.b === b;
          if (!aFixed) {
            a.x -= nx * push * (bFixed ? 2 : 1);
            a.y -= ny * push * (bFixed ? 2 : 1);
          }
          if (!bFixed) {
            b.x += nx * push * (aFixed ? 2 : 1);
            b.y += ny * push * (aFixed ? 2 : 1);
          }
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            const imp = rel * 0.9;
            if (!aFixed) {
              a.vx += nx * imp;
              a.vy += ny * imp;
            }
            if (!bFixed) {
              b.vx -= nx * imp;
              b.vy -= ny * imp;
            }
          }
        }
      }
      for (const b of bodies) {
        // Walls (only once a ball has come inside: they start outside the stage).
        if (b.x > b.r && b.x < w - b.r) b.el.dataset.in = "1";
        if (b.el.dataset.in) {
          if (b.x < b.r) {
            b.x = b.r;
            b.vx = Math.abs(b.vx) * 0.6;
          } else if (b.x > w - b.r) {
            b.x = w - b.r;
            b.vx = -Math.abs(b.vx) * 0.6;
          }
        }
        if (b.y < b.r) {
          b.y = b.r;
          b.vy = Math.abs(b.vy) * 0.6;
        } else if (b.y > h - b.r) {
          b.y = h - b.r;
          b.vy = -Math.abs(b.vy) * 0.6;
        }
        b.el.style.transform = `translate3d(${(b.x - b.r).toFixed(1)}px, ${(b.y - b.r).toFixed(1)}px, 0)`;
        if (b.logo) {
          const lean = (v: number) => Math.max(-22, Math.min(22, v * 5));
          b.logo.style.transform = `translate3d(${(-b.vx * 1.4).toFixed(1)}px, ${(-b.vy * 1.4).toFixed(1)}px, 0) rotateY(${lean(-b.vx).toFixed(1)}deg) rotateX(${lean(b.vy).toFixed(1)}deg)`;
        }
      }
      raf = requestAnimationFrame(step);
    };
    const wake = () => {
      if (!raf && visible) raf = requestAnimationFrame(step);
    };

    const local = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.on = e.pointerType === "mouse" && !drag;
      if (drag) {
        const now = performance.now();
        const dt = Math.max(8, now - drag.t);
        drag.b.vx = ((p.x - drag.px) / dt) * 16;
        drag.b.vy = ((p.y - drag.py) / dt) * 16;
        drag.b.x = p.x;
        drag.b.y = p.y;
        drag.px = p.x;
        drag.py = p.y;
        drag.t = now;
      }
    };
    const onLeave = () => {
      pointer.on = false;
    };
    const onDown = (e: PointerEvent) => {
      // Mouse only: on touch screens a drag must keep scrolling the page.
      if (e.pointerType !== "mouse") return;
      const node = (e.target as Element).closest<HTMLElement>(".orb");
      const b = bodies.find((x) => x.el === node);
      if (!b) return;
      const p = local(e);
      drag = { b, px: p.x, py: p.y, t: performance.now() };
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
    };
    const onUp = () => {
      drag = null;
      el.classList.remove("is-dragging");
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        wake();
      },
      { threshold: 0.25 },
    );
    // Park the balls outside the stage straight away; they fly in when it comes into view.
    layout();
    started = true;
    el.classList.add("is-live");
    io.observe(el);
    const ro = new ResizeObserver(() => started && Math.abs(el.clientWidth - w) > 1 && layout());
    ro.observe(el);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div className="orbs" data-motion="self">
      <ul className="orbs-stage" ref={stage}>
        {items.map((o) => (
          <li
            key={o.name}
            className="orb"
            tabIndex={0}
            aria-label={`${o.name}: ${o.use}`}
            onPointerEnter={() => setActive(o)}
            onFocus={() => setActive(o)}
          >
            <span className="orb-face" aria-hidden="true">
              {o.icon}
              <span>{o.name}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="orbs-caption" aria-hidden="true">
        {active ? (
          <>
            <strong>{active.name}</strong> {active.use}
          </>
        ) : (
          "Move your mouse through the balls, or grab one and throw it."
        )}
      </p>
    </div>
  );
};

export default TechOrbs;
