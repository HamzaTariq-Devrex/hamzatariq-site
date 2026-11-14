"use client";

// Word Rotate, ported from Magic UI (magicui.design/docs/components/word-rotate): cycles through words
// with a short vertical slide (AnimatePresence). Adapted for a headline: all words share one grid
// cell, so the line keeps the width of the longest word (no layout shift), the first word is in the
// server HTML (no LCP delay), and screen readers and crawlers get the full list as text once.
// The visible words are drawn from data-word with CSS ::before, so the H1's text has no duplicates.
import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";

type Props = { words: string[]; duration?: number; className?: string };

const WordRotate = ({ words, duration = 2500, className = "" }: Props) => {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), duration);
    return () => window.clearInterval(id);
  }, [words.length, duration, reduce]);

  return (
    <span className={`word-rotate ${className}`.trim()}>
      <span className="sr-only">{words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : words[0]}</span>
      <span className="word-rotate-stage" aria-hidden="true">
        {words.map((w) => (
          <span key={w} className="word-rotate-sizer" data-word={w} />
        ))}
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={words[index]}
            className="word-rotate-word"
            initial={{ opacity: 0, y: "-0.55em" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "0.55em" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            data-word={words[index]}
          />
        </AnimatePresence>
      </span>
    </span>
  );
};

export default WordRotate;
