/**
 * The AI assistant's mark: a dark circle with a four-point spark in the accent colour. Inline SVG, so
 * it follows the site accent and costs no image request. Used in the chat launcher, panel, messages,
 * nudges and the AI chatbots service visual.
 */
const BotMark = ({ size = 36, className = "" }: { size?: number; className?: string }) => (
  <svg className={`bot-mark ${className}`.trim()} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <circle cx="24" cy="24" r="24" fill="var(--device-2, #1b1931)" />
    <path
      d="M24 11.5c.9 6.2 2.8 9.6 6.6 11.4 1.3.6 1.3 1.6 0 2.2-3.8 1.8-5.7 5.2-6.6 11.4-.9-6.2-2.8-9.6-6.6-11.4-1.3-.6-1.3-1.6 0-2.2 3.8-1.8 5.7-5.2 6.6-11.4z"
      fill="var(--accent-hi, #b9abff)"
    />
    <circle cx="34.5" cy="14.5" r="2.4" fill="#ffffff" />
  </svg>
);

export default BotMark;
