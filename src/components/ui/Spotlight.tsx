// Spotlight, ported from Aceternity UI (ui.aceternity.com/components/spotlight): a large blurred
// ellipse that sweeps in once behind the hero. Tailwind classes replaced by Ui.css (`.spotlight`);
// the fill follows the site accent. Pure SVG + one CSS animation (transform/opacity).
const Spotlight = ({ className = "", fill = "var(--accent)" }: { className?: string; fill?: string }) => (
  <svg className={`spotlight ${className}`.trim()} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3787 2842" fill="none" aria-hidden="true">
    <g filter="url(#spotlight-blur)">
      <ellipse
        cx="1924.71"
        cy="273.501"
        rx="1924.71"
        ry="273.501"
        transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
        style={{ fill }}
        fillOpacity="0.16"
      />
    </g>
    <defs>
      <filter id="spotlight-blur" x="0.860352" y="0.838989" width="3785.16" height="2840.26" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix" />
        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
        <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur_1065_8" />
      </filter>
    </defs>
  </svg>
);

export default Spotlight;
