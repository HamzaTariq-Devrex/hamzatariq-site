/**
 * The site logo: a bold "H" and a full stop ("H." for Hamza) on a rounded tile in the accent gradient,
 * with the name beside it ("Tariq" in the italic serif, like the accent words in headings). Simple
 * strokes so it stays readable at favicon size. Inline SVG, server-safe. `draw` makes the H draw
 * itself and the dot pop in (preloader). The favicon (src/app/icon.tsx) repeats the same mark.
 */
import { useId } from "react";

type Props = { size?: number; wordmark?: boolean; draw?: boolean; className?: string };

export const LogoMark = ({ size = 34, draw = false, className = "" }: Omit<Props, "wordmark">) => {
  // Unique gradient ids: the logo is on the page more than once (header, preloader).
  const id = useId();
  return (
    <svg className={`logo-mark${draw ? " is-draw" : ""} ${className}`.trim()} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}t`} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9a7bff" />
          <stop offset="0.5" stopColor="#5f45f2" />
          <stop offset="1" stopColor="#3aa9ff" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="20" y1="0" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11.5" fill={`url(#${id}t)`} />
      <rect x="1" y="1" width="38" height="20" rx="10.5" fill={`url(#${id}s)`} />
      {/* Three strokes so the preloader draws them one after another: left stem, right stem, crossbar. */}
      <g fill="none" stroke="#fff" strokeWidth="3.8" strokeLinecap="round">
        <path className="logo-mark-h" d="M13 11.5v17" pathLength={1} />
        <path className="logo-mark-h" d="M25 11.5v17" pathLength={1} />
        <path className="logo-mark-h" d="M13 20h12" pathLength={1} />
      </g>
      <circle className="logo-mark-dot" cx="31.2" cy="27.6" r="2.4" fill="#fff" />
    </svg>
  );
};

const Logo = ({ size = 34, wordmark = true, draw = false, className = "" }: Props) => (
  <span className={`logo ${className}`.trim()}>
    <LogoMark size={size} draw={draw} />
    {wordmark && (
      <span className="logo-name">
        Hamza <em>Tariq</em>
      </span>
    )}
  </span>
);

export default Logo;
