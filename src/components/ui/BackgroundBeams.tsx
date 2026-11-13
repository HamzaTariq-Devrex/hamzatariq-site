"use client";

// Background Beams (closing CTA on every page). The server and first load render the beams at rest,
// with the same markup `BeamsLive` renders before it animates, so nothing changes on screen; the
// animated version (and Framer Motion with it) is imported only when the section comes within
// 600px of the screen, which keeps it off every page's first load.
import dynamic from "next/dynamic";
import { memo, useEffect, useRef, useState } from "react";
import { BEAM_BACKGROUND, BEAM_PATHS } from "./beamPaths";

const BeamsStill = () => (
  <svg className="beams-svg" width="100%" height="100%" viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
    <path d={BEAM_BACKGROUND} stroke="url(#beams-bg)" strokeOpacity="0.1" strokeWidth="0.5" />
    {BEAM_PATHS.map((d, i) => (
      <path key={i} d={d} stroke={`url(#beam-${i})`} strokeOpacity="0.8" strokeWidth="0.9" />
    ))}
    <defs>
      {BEAM_PATHS.map((_, i) => (
        <linearGradient id={`beam-${i}`} key={`still-${i}`} x1="0%" x2="0%" y1="0%" y2="0%">
          <stop style={{ stopColor: "var(--accent)" }} stopOpacity="0" />
        </linearGradient>
      ))}
      <radialGradient id="beams-bg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(352 34) rotate(90) scale(555 1560.62)">
        <stop offset="0.0666667" style={{ stopColor: "var(--fg)" }} />
        <stop offset="0.243243" style={{ stopColor: "var(--fg)" }} />
        <stop offset="0.43594" style={{ stopColor: "var(--bg)" }} stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

// While its chunk downloads, the beams stay at rest (no gap).
const BeamsLive = dynamic(() => import("./BeamsLive"), {
  loading: () => (
    <div className="beams" aria-hidden="true">
      <BeamsStill />
    </div>
  ),
});

const BackgroundBeams = memo(function BackgroundBeams({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  if (near) return <BeamsLive className={className} />;
  return (
    <div ref={ref} className={`beams ${className}`.trim()} aria-hidden="true">
      <BeamsStill />
    </div>
  );
});

export default BackgroundBeams;
