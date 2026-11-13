"use client";

// Number Ticker, ported from Magic UI (magicui.design/docs/components/number-ticker): counts up with a
// spring (useMotionValue + useSpring) once the number scrolls into view. Adapted: the real number is in
// the server HTML (crawlers, no-JS and reduced motion see it), and numbers already on screen at load
// are left alone.
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

type Props = { value: number; suffix?: string; className?: string; delay?: number };

const format = (n: number) => Intl.NumberFormat("en-US").format(Math.round(n));

const NumberTicker = ({ value, suffix = "", className = "", delay = 0 }: Props) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const armed = useRef(false);

  // Start from 0 only if the number is below the fold when the page loads.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    armed.current = true;
    motionValue.jump(0);
    spring.jump(0);
    el.textContent = `0${suffix}`;
  }, [motionValue, spring, suffix]);

  useEffect(() => {
    if (!inView || !armed.current) return;
    const t = window.setTimeout(() => motionValue.set(value), delay * 1000);
    return () => window.clearTimeout(t);
  }, [inView, value, delay, motionValue]);

  useEffect(
    () =>
      spring.on("change", (latest) => {
        if (ref.current && armed.current) ref.current.textContent = `${format(latest)}${suffix}`;
      }),
    [spring, suffix],
  );

  return (
    <span ref={ref} className={`number-ticker ${className}`.trim()}>
      {format(value)}
      {suffix}
    </span>
  );
};

export default NumberTicker;
