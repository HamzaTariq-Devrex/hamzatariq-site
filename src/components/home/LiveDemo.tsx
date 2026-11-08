"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { OWN_SITE_RESULTS } from "@/data/ownSite";
import { DEMO_ANSWER as ANSWER, DEMO_QUESTION as QUESTION, DEMO_SCENES as SCENES } from "./demoContent";

/**
 * Hero "live demo": real UI in three scenes, cycling every few seconds (pauses on hover/focus,
 * tabs switch manually). 1) the AI assistant answering a pricing question with its real saved
 * answer, 2) the SEO score ring filling to the score measured on this site, 3) a small dashboard
 * chart drawing itself (marked as demo data). Transform/opacity/stroke only.
 */
const SCENE_MS = 6500;

const ease = [0.22, 1, 0.36, 1] as const;

const ChatScene = ({ still }: { still: boolean }) => {
  const [chars, setChars] = useState(still ? ANSWER.length : 0);
  const [typing, setTyping] = useState(!still);
  useEffect(() => {
    if (still) return;
    let i = 0;
    let timer = 0;
    const start = window.setTimeout(() => {
      setTyping(false);
      timer = window.setInterval(() => {
        i += 3;
        setChars(Math.min(i, ANSWER.length));
        if (i >= ANSWER.length) window.clearInterval(timer);
      }, 22);
    }, 1100);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [still]);

  return (
    <div className="demo-chat">
      <m.p className="demo-msg is-user" initial={still ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        {QUESTION}
      </m.p>
      <div className="demo-msg-row">
        <span className="demo-avatar" aria-hidden="true">
          AI
        </span>
        {typing ? (
          <m.span className="demo-msg is-bot demo-typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} aria-label="Typing">
            <i />
            <i />
            <i />
          </m.span>
        ) : (
          <p className="demo-msg is-bot">
            {ANSWER.slice(0, chars)}
            {chars < ANSWER.length && <span className="demo-caret" aria-hidden="true" />}
          </p>
        )}
      </div>
      <p className="demo-foot">Answers from this site&apos;s own content · try it bottom right</p>
    </div>
  );
};

const SeoScene = ({ still }: { still: boolean }) => {
  const score = Number(OWN_SITE_RESULTS.seo.after);
  const before = OWN_SITE_RESULTS.seo.before;
  const [shown, setShown] = useState(still ? score : 0);
  useEffect(() => {
    if (still) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1600);
      setShown(Math.round(score * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [still, score]);
  const checks = ["Unique titles and descriptions", "Sitemap and robots.txt", "Structured data", "Pre-rendered pages"];

  return (
    <div className="demo-seo">
      <div className="demo-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" className="demo-ring-track" />
          <m.circle
            cx="60"
            cy="60"
            r="52"
            className="demo-ring-value"
            initial={still ? false : { pathLength: 0 }}
            animate={{ pathLength: score / 100 }}
            transition={{ duration: 1.6, ease }}
          />
        </svg>
        <span className="demo-ring-num">{shown}</span>
      </div>
      <div className="demo-seo-side">
        <p className="demo-kicker">Mobile SEO score</p>
        <ul>
          {checks.map((c, i) => (
            <m.li key={c} initial={still ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.18, duration: 0.4, ease }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              {c}
            </m.li>
          ))}
        </ul>
        <p className="demo-foot">Measured on this site after the Next.js move (was {before})</p>
      </div>
    </div>
  );
};

// Demo data, clearly labelled: a week of orders drawn as a line over bars.
const BARS = [38, 52, 46, 64, 58, 76, 88];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const linePath = BARS.map((v, i) => `${i === 0 ? "M" : "L"}${20 + i * 43},${150 - v * 1.3}`).join(" ");

const DashScene = ({ still }: { still: boolean }) => (
  <div className="demo-dash">
    <div className="demo-dash-head">
      <div>
        <p className="demo-kicker">Orders this week</p>
        <p className="demo-dash-num">422</p>
      </div>
      <span className="demo-tag">Demo data</span>
    </div>
    <svg viewBox="0 0 300 170" className="demo-chart" aria-hidden="true">
      {[40, 80, 120].map((y) => (
        <line key={y} x1="0" x2="300" y1={y} y2={y} className="demo-grid" />
      ))}
      {BARS.map((v, i) => (
        <m.rect
          key={i}
          x={8 + i * 43}
          width="24"
          rx="5"
          y={150 - v * 1.3}
          height={v * 1.3}
          className="demo-bar"
          style={{ transformOrigin: `${20 + i * 43}px 150px` }}
          initial={still ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.1 + i * 0.07, duration: 0.6, ease }}
        />
      ))}
      <m.path d={linePath} className="demo-line" initial={still ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 1.4, ease }} />
      {DAYS.map((d, i) => (
        <text key={d} x={20 + i * 43} y="166" className="demo-axis">
          {d}
        </text>
      ))}
    </svg>
  </div>
);

/** `startStill`: the first scene shows its final state (it takes over from DemoStatic without a flicker). */
const LiveDemo = ({ startStill = false }: { startStill?: boolean }) => {
  const reduce = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [cycled, setCycled] = useState(false);
  useEffect(() => {
    if (index !== 0) setCycled(true);
  }, [index]);
  const still = reduce || (startStill && index === 0 && !cycled);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || reduce) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % SCENES.length), SCENE_MS);
    return () => window.clearTimeout(t);
  }, [index, paused, reduce]);

  const scene = SCENES[index];
  return (
    <div
      className="demo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="demo-bar-top">
        <span className="demo-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="demo-live">
          <span className="demo-live-dot" aria-hidden="true" />
          Live demo
        </span>
      </div>
      <div className="demo-tabs" role="tablist" aria-label="Live demo">
        {SCENES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`demo-tab-${s.id}`}
            aria-selected={i === index}
            aria-controls="demo-panel"
            className="demo-tab"
            onClick={() => setIndex(i)}
          >
            {s.label}
            {i === index && !reduce && (
              <m.span
                key={`${s.id}-${paused}`}
                className="demo-progress"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: paused ? 0 : 1 }}
                transition={{ duration: paused ? 0.2 : SCENE_MS / 1000, ease: "linear" }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="demo-body" id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${scene.id}`}>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={scene.id}
            className="demo-scene"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
          >
            {scene.id === "chat" && <ChatScene still={still} />}
            {scene.id === "seo" && <SeoScene still={reduce} />}
            {scene.id === "dash" && <DashScene still={reduce} />}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveDemo;
