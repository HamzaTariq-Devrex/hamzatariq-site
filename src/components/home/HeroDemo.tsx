"use client";

import { useEffect, useState } from "react";
import DemoStatic from "./DemoStatic";

type Loaded = typeof import("./LiveDemo").default;

/**
 * Hero demo: the static first frame (server HTML) until the page has loaded and the browser is idle,
 * then the interactive LiveDemo, loaded on demand so its code never delays the first paint.
 */
const HeroDemo = () => {
  const [Live, setLive] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const run = () =>
        import("./LiveDemo").then((m) => {
          if (!cancelled) setLive(() => m.default);
        });
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 2500 });
      else setTimeout(run, 600); // Safari without requestIdleCallback
    };
    if (document.readyState === "complete") load();
    else window.addEventListener("load", load, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", load);
    };
  }, []);

  return Live ? <Live startStill /> : <DemoStatic />;
};

export default HeroDemo;
