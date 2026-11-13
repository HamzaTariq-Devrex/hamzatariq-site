"use client";

// Text Reveal, ported from Magic UI (magicui.design/docs/components/text-reveal): a block of text whose
// words light up one by one as you scroll (useScroll + useTransform on opacity). Adapted: it is not
// pinned (the original's tall sticky section left a screen of empty space around the quote); the
// words light up while the block travels up the screen. The faint "ghost" copy of each word is a CSS pseudo-element (the text exists once
// in the HTML), the block can carry a footer (who said it), and with reduced motion all words show.
// CSS in Ui.css (`.text-reveal`).
import { useRef } from "react";
import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

type Props = { text: string; className?: string; children?: React.ReactNode; as?: "blockquote" | "p" };

const Word = ({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) => {
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <span className="text-reveal-word" data-w={word}>
      <m.span style={{ opacity }}>{word}</m.span>
    </span>
  );
};

const TextReveal = ({ text, className = "", children, as = "blockquote" }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.92", "end 0.62"] });
  const words = text.split(" ");
  const Tag = as;

  return (
    <div ref={ref} className={`text-reveal ${className}`.trim()} data-motion="self">
      <div className="text-reveal-sticky">
        <Tag className="text-reveal-text">
          {reduce
            ? text
            : words.map((w, i) => {
                const start = i / words.length;
                return <Word key={i} word={w} progress={scrollYProgress} range={[start * 0.85, (start + 1 / words.length) * 0.85]} />;
              })}
        </Tag>
        {children}
      </div>
    </div>
  );
};

export default TextReveal;
