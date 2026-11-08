"use client";

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";

/**
 * Framer Motion for the whole site, with the small DOM-animation feature set (LazyMotion + `m.*`
 * components keep the bundle light). `reducedMotion="user"` turns transform animations off for
 * visitors who prefer reduced motion.
 */
const MotionProvider = ({ children }: { children: React.ReactNode }) => (
  <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);

export default MotionProvider;
