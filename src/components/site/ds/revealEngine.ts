/**
 * Framer-style scroll animations for every page (mounted once in SiteShell), built on Framer Motion's
 * DOM API (`animate` with springs, `inView`, `scroll`):
 *
 * - Content slides in from the sides as it enters the viewport (20% visible, once): text from the left,
 *   images, cards and visuals from the right; opacity 0 → 1, blur 8px → 0, spring (stiffness 80,
 *   damping 20). Phones move 40px instead of 80px.
 * - Grids (`[data-stagger]`, or any CSS grid with items side by side) stagger their items 0.08 s apart,
 *   alternating left/right, scale 0.95 → 1. Two-column sections: left column from the left, right
 *   column from the right.
 * - Headings (h2, the closing CTA, `[data-words]`, and the h1 after a client-side navigation): words
 *   slide up one by one inside a mask, the accent word (`<span>`) last.
 * - `[data-parallax]` images move 12% slower than the scroll; `[data-clip]` frames open left to right
 *   on first view.
 *
 * Units are `[data-reveal]` (value left|right|up forces a direction), `[data-stagger]` grids, and, in
 * blocks without markers, the block's own children. `[data-motion="self"]` opts a block out (pinned
 * sections, scroll-linked components). Only transform, opacity, filter and clip-path animate.
 * It is set up after the page has painted (never delaying a navigation); nothing already on screen
 * is hidden, so there is no flash and no LCP delay. Reduced motion: a short fade only.
 */
import { animate, inView, scroll } from "framer-motion";

const SPRING = { type: "spring", stiffness: 80, damping: 20, mass: 1 } as const;
const FADE = { duration: 0.8, ease: [0.22, 1, 0.36, 1] } as const;
const WORD = { duration: 0.75, ease: [0.16, 1, 0.3, 1] } as const;

const BLOCKS = ".page-main > *, .page-footer > .page-cta";
// Only server-rendered headings (splitting text that React updates later would break it).
const HEADINGS = ".x-h2, .page-hero h2, .post-body h2, .page-cta h2, [data-words]";
const H1 = ".x-h1, .page-hero h1, .svc-hero h1, .about-hero h1, .post-header h1, .page-main > section:first-child h1";
const MEDIA = "img, picture, video, canvas";
const MEDIA_CLASS = /(^|[\s-])(visual|card|shot|frame|photo|mock|media|browser|phone|tile|item|story)($|[\s-])/;

type Dir = "left" | "right" | "up";
export type Stop = () => void;

const isMedia = (el: HTMLElement) => {
  if (el.matches(MEDIA) || MEDIA_CLASS.test(el.className.toString())) return true;
  return !!el.querySelector(MEDIA) && (el.textContent ?? "").trim().length < 90;
};

// A grid whose first two items sit side by side (or a wrapping flex row of 3+ items).
const isGrid = (el: HTMLElement) => {
  const kids = [...el.children].filter((c) => (c as HTMLElement).offsetParent !== null) as HTMLElement[];
  if (kids.length < 2) return false;
  const cs = getComputedStyle(el);
  const sideBySide = Math.abs(kids[0].getBoundingClientRect().top - kids[1].getBoundingClientRect().top) < 4;
  if (cs.display.includes("grid")) return sideBySide;
  return cs.display.includes("flex") && cs.flexWrap === "wrap" && kids.length >= 3 && sideBySide;
};

// Splits a heading into word masks. Words inside a direct <span> child (the accent) are marked.
const splitWords = (el: HTMLElement) => {
  if (el.dataset.split) return [...el.querySelectorAll<HTMLElement>(".ln-in")];
  el.dataset.split = "1";
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const node of texts) {
    const accent = node.parentElement !== el && node.parentElement?.closest("h1, h2, h3, [data-words]") === el && node.parentElement?.tagName === "SPAN";
    const frag = document.createDocumentFragment();
    for (const part of node.data.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const mask = document.createElement("span");
      mask.className = "ln";
      const inner = document.createElement("span");
      inner.className = accent ? "ln-in is-accent" : "ln-in";
      inner.textContent = part;
      mask.appendChild(inner);
      frag.appendChild(mask);
    }
    node.replaceWith(frag);
  }
  el.classList.add("words-ready");
  return [...el.querySelectorAll<HTMLElement>(".ln-in")];
};

// Blocks without markers: their own children (wrappers with one child are opened up).
const autoUnits = (block: HTMLElement) => {
  let parent: HTMLElement = block;
  for (let depth = 0; depth < 3 && parent.children.length === 1; depth += 1) parent = parent.children[0] as HTMLElement;
  return [...parent.children].filter((c) => !c.matches("script, style, h1, h2, [data-words]")) as HTMLElement[];
};

export function run(isFirst: boolean): Stop[] {
  const stops: Stop[] = [];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dist = window.innerWidth < 768 ? 40 : 80;
  const vh = window.innerHeight;
  const onScreen = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.top < vh && r.bottom > 0;
  };
  const skip = (el: HTMLElement) => !!el.closest('[data-motion="self"], [data-motion="none"]') || el.dataset.motionDone === "1";
  // First load: what is already on screen stays as it is. Later navigations animate everything.
  const shouldHide = (el: HTMLElement) => !(isFirst && onScreen(el));

  // Rows that scroll sideways (carousels): animate the row as one block, not each card.
  const scrollsSideways = (el: HTMLElement) => /auto|scroll/.test(getComputedStyle(el).overflowX);
  const scrollsSidewaysParent = (el: HTMLElement) => scrollsSideways(el) && el.scrollWidth > el.clientWidth + 4;

  const watch = (el: HTMLElement, cb: () => void) => {
    const h = el.getBoundingClientRect().height || 1;
    // Once: stop watching after the first time it comes into view.
    let stop: Stop | null = null;
    let fired = false;
    stop = inView(
      el,
      () => {
        if (fired) return;
        fired = true;
        cb();
        queueMicrotask(() => stop?.());
      },
      // Extra room at the sides: an element shifted off-screen by its slide offset still counts.
      { amount: Math.min(0.2, (vh * 0.5) / h), margin: "0px 160px 0px 160px" },
    );
    stops.push(() => stop?.());
  };

  const reveal = (el: HTMLElement, dir: Dir, delay = 0, scale = 1) => {
    if (skip(el) || !shouldHide(el) || !el.getClientRects().length) return;
    // Cards inside a sideways-scrolling row stay as they are (they'd wait for a swipe otherwise).
    if (el.parentElement && el.parentElement !== el && scrollsSidewaysParent(el.parentElement)) return;
    el.dataset.motionDone = "1";
    const x = dir === "left" ? -dist : dir === "right" ? dist : 0;
    const y = dir === "up" ? 32 : 0;
    // Hidden in place; the slide offset is applied when the animation starts, so the element is
    // observed at its real position (an offset could push it outside the page's clip box).
    el.style.opacity = "0";
    if (!reduce) el.style.filter = "blur(8px)";
    watch(el, () => {
      const done = () => {
        el.style.removeProperty("opacity");
        el.style.removeProperty("transform");
        el.style.removeProperty("filter");
      };
      if (reduce) {
        animate(el, { opacity: [0, 1] }, { duration: 0.4, delay }).then(done);
        return;
      }
      animate(
        el,
        { x: [x, 0], y: [y, 0], scale: [scale, 1], opacity: [0, 1], filter: ["blur(8px)", "blur(0px)"] },
        { default: { ...SPRING, delay }, opacity: { ...FADE, delay }, filter: { ...FADE, delay } },
      ).then(done);
    });
  };


  const stagger = (grid: HTMLElement) => {
    if (skip(grid)) return;
    if (scrollsSideways(grid)) return reveal(grid, "right");
    grid.dataset.motionDone = "1";
    [...grid.children].forEach((child, i) => {
      const el = child as HTMLElement;
      const forced = el.dataset.reveal as Dir | undefined;
      reveal(el, forced === "left" || forced === "right" || forced === "up" ? forced : i % 2 ? "right" : "left", Math.min(i, 10) * 0.08, 0.95);
    });
  };

  const unit = (el: HTMLElement) => {
    if (skip(el)) return;
    if (el.hasAttribute("data-stagger") || isGrid(el)) return stagger(el);
    const forced = el.dataset.reveal;
    const dir: Dir = forced === "left" || forced === "right" || forced === "up" ? forced : isMedia(el) ? "right" : "left";
    reveal(el, dir);
  };

  // 1. Headings: masked word reveal, accent words last.
  const headings = [...document.querySelectorAll<HTMLElement>(HEADINGS)];
  if (!isFirst) document.querySelectorAll<HTMLElement>(H1).forEach((h) => !headings.includes(h) && headings.push(h));
  for (const h of headings) {
    if (h.closest('[data-motion="self"], [data-motion="none"]') || h.dataset.split || !shouldHide(h) || reduce) continue;
    const words = splitWords(h);
    const plain = words.filter((w) => !w.classList.contains("is-accent"));
    const order = [...plain, ...words.filter((w) => w.classList.contains("is-accent"))];
    for (const w of words) w.style.transform = "translateY(110%)";
    watch(h, () => {
      order.forEach((w, i) => {
        animate(w, { y: ["110%", "0%"] }, { ...WORD, delay: Math.min(i, 14) * 0.06 }).then(() => w.style.removeProperty("transform"));
      });
    });
  }

  // 2. Explicit units, then blocks without markers.
  document.querySelectorAll<HTMLElement>("[data-stagger]").forEach(stagger);
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach(unit);
  document.querySelectorAll<HTMLElement>(BLOCKS).forEach((block) => {
    if (skip(block) || block.querySelector("[data-reveal], [data-stagger]")) return;
    autoUnits(block).forEach(unit);
  });

  // 3. Parallax and clip reveals (not with reduced motion).
  if (!reduce) {
    document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
      if (el.dataset.parallaxOn) return;
      el.dataset.parallaxOn = "1";
      const frame = el.parentElement ?? el;
      stops.push(scroll(animate(el, { y: ["-6%", "6%"] }, { ease: "linear" }), { target: frame, offset: ["start end", "end start"] }));
    });
    document.querySelectorAll<HTMLElement>("[data-clip]").forEach((el) => {
      if (el.dataset.clipDone || !shouldHide(el)) return;
      el.dataset.clipDone = "1";
      el.style.clipPath = "inset(0 100% 0 0)";
      // Watch the parent: a fully clipped element never counts as visible.
      watch(el.parentElement ?? el, () => {
        animate(el, { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"] }, { duration: 1.1, ease: [0.65, 0, 0.35, 1] }).then(() => el.style.removeProperty("clip-path"));
      });
    });
  }
  return stops;
}
