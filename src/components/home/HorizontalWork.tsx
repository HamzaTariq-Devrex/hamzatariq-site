"use client";

// Selected work as a pinned horizontal scroll on desktop: the section sticks to the screen and
// scrolling down moves the project cards sideways (Framer Motion useScroll + useTransform, transform
// only). On phones, tablets and with reduced motion it's a normal vertical stack whose cards slide in
// from alternating sides (Reveal). The section height is set from the track width, so the sideways
// distance always matches the scroll distance.
import { useEffect, useRef, useState } from "react";
import { m, useScroll, useTransform } from "framer-motion";

const HorizontalWork = ({ head, children, after }: { head: React.ReactNode; children: React.ReactNode; after?: React.ReactNode }) => {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [dist, setDist] = useState(0);
  const pinned = dist > 0;

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    const measure = () => {
      if (!mq.matches) return setDist(0);
      const vp = el.parentElement!;
      const cs = getComputedStyle(vp);
      const inner = vp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setDist(Math.max(0, Math.round(el.scrollWidth - inner)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0.04, 0.96], [0, -dist], { clamp: true });

  return (
    <section ref={section} className={`hwork${pinned ? " is-pinned" : ""}`} style={pinned ? ({ "--hwork-dist": `${dist}px` } as React.CSSProperties) : undefined}>
      <div className="hwork-sticky">
        {head}
        <div className="hwork-viewport">
          <m.div ref={track} className="hwork-track" style={pinned ? { x } : undefined} data-stagger>
            {children}
          </m.div>
        </div>
        {after}
      </div>
    </section>
  );
};

export default HorizontalWork;
