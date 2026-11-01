// Line icons for the design system (24px grid, 1.8px stroke, currentColor). Server-safe.
const PATHS = {
  speed: "M12 14l4-4M3.5 15a9 9 0 1 1 17 0M12 14a1 1 0 1 0 0 .01",
  design: "M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3zM12 12l9-4.5M12 12v9M12 12L3 7.5",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3",
  orders: "M3 6h18l-2 12H5L3 6zM8 6V4h8v2M9 11h6",
  sheet: "M4 4h16v16H4zM4 9h16M4 14h16M9 4v16",
  puzzle: "M10 3h4v3a2 2 0 1 0 4 0V3h3v7h-3a2 2 0 1 0 0 4h3v7h-7v-3a2 2 0 1 0-4 0v3H3v-7h3a2 2 0 1 0 0-4H3V3h7z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  leads: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M22 11h-6",
  warning: "M12 3l10 18H2L12 3zM12 10v4M12 17.5v.01",
  empty: "M4 4h16v16H4zM8 9h8M8 13h5",
  tag: "M3 12V3h9l9 9-9 9-9-9zM7.5 7.5v.01",
  mobile: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16",
  call: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  plan: "M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M14 4h6v6M10 14L20 4",
  rocket: "M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14 4c3-1 6-1 6-1s0 3-1 6l-7 7-5-5 7-7zM9 11l-3 1-2 3 4 1M13 15l-1 3-3 2-1-4M15 9a1 1 0 1 0 0-.01",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  lock: "M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3",
  check: "M5 12.5l4.5 4.5L19 7.5",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  message: "M4 5h16v11H8l-4 4V5z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5v.01",
  arrow: "M5 12h14M13 6l6 6-6 6",
  handshake: "M8 12l3 3 6-6M3 12l4-4 3 1 4-3 3 1 4 4-7 7-4-1-3 1-4-6z",
} as const;

export type IconName = keyof typeof PATHS;

const Icon = ({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d={PATHS[name]} />
  </svg>
);

export default Icon;
