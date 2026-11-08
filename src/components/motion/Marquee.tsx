"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Outer element; gets "is-looping" once the copy exists (the CSS animation keys off it). */
  className: string;
  /** The moving track that holds the items. */
  trackClassName: string;
  /** Class of the cloned copy appended inside the track. */
  copyClassName: string;
  children: React.ReactNode;
};

/**
 * Infinite marquee for server-rendered items: after load it clones the track's items into a copy
 * (aria-hidden, inert, links out of the tab order) so the loop is seamless. The copy never weighs on
 * the server HTML and the item data never ships to the browser. No copy and no loop for reduced motion.
 */
const Marquee = ({ className, trackClassName, copyClassName, children }: Props) => {
  const track = useRef<HTMLDivElement>(null);
  const [looping, setLooping] = useState(false);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const copy = document.createElement("div");
    copy.className = copyClassName;
    copy.setAttribute("aria-hidden", "true");
    copy.inert = true;
    for (const child of [...el.children]) copy.appendChild(child.cloneNode(true));
    copy.querySelectorAll("a, button").forEach((a) => a.setAttribute("tabindex", "-1"));
    copy.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    el.appendChild(copy);
    setLooping(true);
    return () => {
      copy.remove();
      setLooping(false);
    };
  }, [copyClassName]);

  return (
    <div className={`${className}${looping ? " is-looping" : ""}`}>
      <div ref={track} className={trackClassName}>
        {children}
      </div>
    </div>
  );
};

export default Marquee;
