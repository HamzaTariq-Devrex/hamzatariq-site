"use client";

import { useEffect } from "react";
import { m } from "framer-motion";

// Smooth page transitions on client-side navigation (fade + small rise, transform/opacity only).
// The first page load is never animated (and the server never renders the hidden state), so
// nothing delays the first paint or LCP.
let hasMounted = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const animate = typeof window !== "undefined" && hasMounted;
  useEffect(() => {
    hasMounted = true;
  }, []);
  return (
    <m.div
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}
