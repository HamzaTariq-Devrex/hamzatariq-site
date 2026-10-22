import type { Project } from "@/data/projects";
import { SITE } from "./site";

export const TITLE_SUFFIX = " | Hamza Tariq";
const TITLE_MAX = 60;
const DESC_MIN = 150;
const DESC_MAX = 160;

const clampAtWord = (text: string, max: number) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace).replace(/[,.;:\s]+$/, "")}…`;
};

/** Joins sentences until the text reaches 150 chars, then trims to at most 160 at a word boundary. */
export const fitDescription = (parts: string[]) => {
  let text = "";
  for (const part of parts) {
    if (!part) continue;
    const candidate = text ? `${text} ${part}` : part;
    if (candidate.length <= DESC_MAX) {
      text = candidate;
      if (text.length >= DESC_MIN) return text;
      continue;
    }
    const clamped = clampAtWord(candidate, DESC_MAX);
    if (clamped.length >= DESC_MIN) return clamped;
  }
  return clampAtWord(parts.filter(Boolean).join(" "), DESC_MAX);
};

/** Picks the first candidate that fits in 60 chars including the site suffix. */
export const fitTitle = (candidates: string[]) =>
  candidates.find((c) => c.length + TITLE_SUFFIX.length <= TITLE_MAX) ??
  clampAtWord(candidates[candidates.length - 1], TITLE_MAX - TITLE_SUFFIX.length);

export const projectTitle = (p: Project) =>
  fitTitle([`${p.title}: ${p.label} Website`, `${p.title}: ${p.label}`, `${p.title} Website`, p.title]);

export const projectDescription = (p: Project) =>
  fitDescription([
    ...(p.description.match(/[^.!?]+[.!?]+/g) ?? [p.description]).map((s) => s.trim()),
    `Built by ${SITE.name} at ${SITE.agency.name}.`,
    p.features.length ? `Features: ${p.features.join(", ")}.` : "",
    p.mobileImage
      ? "See the desktop and mobile design and what was built."
      : "See the design and what was built for this client.",
    `More ${p.category.toLowerCase()} projects are in the portfolio.`,
  ]);

export const jsonLd = (data: object) => ({
  __html: JSON.stringify(data).replace(/</g, "\\u003c"),
});
