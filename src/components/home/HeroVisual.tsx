"use client";

import { useEffect, useRef, useState } from "react";

type SceneModule = typeof import("./HeroScene");

/**
 * Hero visual: a static rendered image of the 3D scene (server HTML, so the hero is complete at first
 * paint), upgraded to the live WebGL scene after the page has loaded and the browser is idle, only on
 * desktop-class devices: a fine pointer, at least 1024px wide, 4+ CPU cores and 4 GB+ memory where the
 * browser reports them, WebGL available, and no reduced-motion preference. Phones, low-power devices
 * and reduced motion keep the image. The scene stops rendering when off-screen or the tab is hidden.
 */
const canRun3D = () => {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.hardwareConcurrency ?? 8) < 4 || (nav.deviceMemory ?? 8) < 4) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

const HeroVisual = () => {
  const box = useRef<HTMLDivElement>(null);
  const [Scene, setScene] = useState<SceneModule["default"] | null>(null);
  const [running, setRunning] = useState(true);
  const [ready, setReady] = useState(false);

  // Load the scene after load + idle, on capable devices only.
  useEffect(() => {
    if (!canRun3D()) return;
    let cancelled = false;
    const load = () => {
      const run = () =>
        import("./HeroScene").then((m) => {
          if (!cancelled) setScene(() => m.default);
        });
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 2500 });
      else setTimeout(run, 600);
    };
    if (document.readyState === "complete") load();
    else window.addEventListener("load", load, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", load);
    };
  }, []);

  // Pause when the hero is off-screen or the tab is hidden.
  useEffect(() => {
    const el = box.current;
    if (!el || !Scene) return;
    let visible = true;
    const update = () => setRunning(visible && !document.hidden);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      update();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [Scene]);

  return (
    <div className={`hero-visual${ready ? " is-live" : ""}`} ref={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="hero-visual-still"
        src="/images/hero-shapes-1200.webp"
        srcSet="/images/hero-shapes-720.webp 720w, /images/hero-shapes-1200.webp 1200w"
        sizes="(max-width: 1023px) 92vw, 50vw"
        width={1200}
        height={960}
        alt=""
        fetchPriority="high"
      />
      {Scene && (
        <div className="hero-visual-canvas">
          <Scene running={running} onReady={() => setTimeout(() => setReady(true), 120)} />
        </div>
      )}
    </div>
  );
};

export default HeroVisual;
