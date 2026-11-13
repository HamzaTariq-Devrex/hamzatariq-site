"use client";

import { LazyMotion, MotionConfig } from "framer-motion";

/**
 * Framer Motion for the whole site, with the small DOM-animation feature set (LazyMotion + `m.*`
 * components keep the bundle light). The features load asynchronously (`motionFeatures.ts`), so the
 * animation code is not part of any page's first load. `reducedMotion="user"` turns transform
 * animations off for visitors who prefer reduced motion.
 */
const loadFeatures = () => import("./motionFeatures").then((mod) => mod.default);

const MotionProvider = ({ children }: { children: React.ReactNode }) => (
  <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);

export default MotionProvider;
