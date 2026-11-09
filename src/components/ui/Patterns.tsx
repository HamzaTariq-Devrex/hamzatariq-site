// Grid Pattern and Dot Pattern, ported from Magic UI (magicui.design/docs/components/grid-pattern and
// /dot-pattern): faint SVG backgrounds behind a section. Adapted: both use one SVG <pattern> (Magic
// UI's Dot Pattern draws one <circle> per dot, which means thousands of DOM nodes), and they fade out
// at the edges with a radial mask. CSS in Ui.css (`.pattern`).
import { useId } from "react";

type Props = { className?: string; size?: number };

export const GridPattern = ({ className = "", size = 44 }: Props) => {
  const id = useId();
  return (
    <svg className={`pattern pattern-grid ${className}`.trim()} aria-hidden="true">
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" x="-1" y="-1">
          <path d={`M.5 ${size}V.5H${size}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
};

export const DotPattern = ({ className = "", size = 18 }: Props) => {
  const id = useId();
  return (
    <svg className={`pattern pattern-dots ${className}`.trim()} aria-hidden="true">
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1.2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
};
