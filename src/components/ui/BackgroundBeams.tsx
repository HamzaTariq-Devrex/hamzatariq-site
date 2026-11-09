"use client";

// Background Beams, ported from Aceternity UI (ui.aceternity.com/components/background-beams): faint
// curved lines with light travelling along them (animated gradient positions). Adapted: 17 of the 50
// beams, accent-coloured stops, and the beams only animate while the section is on screen (and never
// with reduced motion). CSS in Ui.css (`.beams`).
import { memo, useRef } from "react";
import { m, useInView, useReducedMotion } from "framer-motion";
import { BEAM_BACKGROUND, BEAM_PATHS } from "./beamPaths";

// Fixed "random" timings so the server and browser render the same thing.
const TIMING = BEAM_PATHS.map((_, i) => ({ duration: 10 + ((i * 7) % 10), delay: (i * 3) % 10, y2: 93 + ((i * 5) % 8) }));

const BackgroundBeams = memo(function BackgroundBeams({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.1 });
  const reduce = useReducedMotion();
  const live = inView && !reduce;

  return (
    <div ref={ref} className={`beams ${className}`.trim()} aria-hidden="true">
      <svg className="beams-svg" width="100%" height="100%" viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
        <path d={BEAM_BACKGROUND} stroke="url(#beams-bg)" strokeOpacity="0.1" strokeWidth="0.5" />
        {BEAM_PATHS.map((d, i) => (
          <path key={i} d={d} stroke={`url(#beam-${i})`} strokeOpacity="0.8" strokeWidth="0.9" />
        ))}
        <defs>
          {BEAM_PATHS.map((_, i) =>
            live ? (
              <m.linearGradient
                id={`beam-${i}`}
                key={`live-${i}`}
                initial={{ x1: "0%", x2: "0%", y1: "0%", y2: "0%" }}
                animate={{ x1: ["0%", "100%"], x2: ["0%", "95%"], y1: ["0%", "100%"], y2: ["0%", `${TIMING[i].y2}%`] }}
                transition={{ duration: TIMING[i].duration, ease: "easeInOut", repeat: Infinity, delay: TIMING[i].delay }}
              >
                <stop style={{ stopColor: "var(--accent)" }} stopOpacity="0" />
                <stop style={{ stopColor: "var(--accent)" }} />
                <stop offset="32.5%" style={{ stopColor: "var(--accent-hi)" }} />
                <stop offset="100%" style={{ stopColor: "var(--fg)" }} stopOpacity="0" />
              </m.linearGradient>
            ) : (
              <linearGradient id={`beam-${i}`} key={`still-${i}`} x1="0%" x2="0%" y1="0%" y2="0%">
                <stop style={{ stopColor: "var(--accent)" }} stopOpacity="0" />
              </linearGradient>
            ),
          )}
          <radialGradient id="beams-bg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(352 34) rotate(90) scale(555 1560.62)">
            <stop offset="0.0666667" style={{ stopColor: "var(--fg)" }} />
            <stop offset="0.243243" style={{ stopColor: "var(--fg)" }} />
            <stop offset="0.43594" style={{ stopColor: "var(--bg)" }} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
});

export default BackgroundBeams;
