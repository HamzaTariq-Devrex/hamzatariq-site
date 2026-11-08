"use client";

import { useEffect } from "react";
import { m } from "framer-motion";

// Page transitions on client-side navigation: an ink curtain lifts away (scaleY, 0.5 s) while the
// new page fades and rises in. Transform/opacity only. The first page load is never animated (and
// the server never renders the hidden state), so nothing delays the first paint or LCP.
let hasMounted = false;
const ease = [0.76, 0, 0.24, 1] as const;

export default function Template({ children }: { children: React.ReactNode }) {
  const animate = typeof window !== "undefined" && hasMounted;
  useEffect(() => {
    hasMounted = true;
  }, []);
  return (
    <>
      {animate && (
        <m.div
          aria-hidden="true"
          className="page-curtain"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 0.5, ease }}
        />
      )}
      <m.div
        initial={animate ? { opacity: 0, y: 14 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: animate ? 0.12 : 0 }}
      >
        {children}
      </m.div>
    </>
  );
}
