"use client";

// Timeline, ported from Aceternity UI (ui.aceternity.com/components/timeline): entries with a sticky
// title on the left and content on the right, and a line that fills in as you scroll through them
// (useScroll + useTransform). Adapted: the fill uses scaleY instead of height (transform only), the
// colours come from the site tokens, and an optional `aside` (a photo) sticks beside the entries on
// wide screens. CSS in Ui.css (`.timeline`).
import { useRef } from "react";
import { m, useScroll, useTransform } from "framer-motion";

export type TimelineEntry = { title: string; kicker?: string; content: React.ReactNode };

const Timeline = ({ data, aside }: { data: TimelineEntry[]; aside?: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 55%"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.08], [0, 1]);

  return (
    <div className={`timeline${aside ? " has-aside" : ""}`}>
      <div ref={ref} className="timeline-entries">
        {data.map((item) => (
          <div key={item.title} className="timeline-entry" data-reveal="left">
            <div className="timeline-title">
              <span className="timeline-dot" aria-hidden="true">
                <i />
              </span>
              {item.kicker && <span className="timeline-kicker">{item.kicker}</span>}
              <h3>{item.title}</h3>
            </div>
            <div className="timeline-content">{item.content}</div>
          </div>
        ))}
        <div className="timeline-rail" aria-hidden="true">
          <m.div className="timeline-fill" style={{ scaleY, opacity }} />
        </div>
      </div>
      {aside && (
        <div className="timeline-aside" data-reveal="right">
          {aside}
        </div>
      )}
    </div>
  );
};

export default Timeline;
