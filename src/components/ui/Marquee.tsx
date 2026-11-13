// Marquee, ported from Magic UI (magicui.design/docs/components/marquee): the content is repeated
// `repeat` times and every copy slides by its own width plus the gap (CSS animation, transform only,
// so it keeps moving smoothly). Copies after the first are hidden from screen readers and inert.
// Pauses on hover when `pauseOnHover`; static with reduced motion. CSS in Ui.css (`.mq`).
type Props = {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  repeat?: number;
  /** Seconds for one loop. */
  duration?: number;
  "aria-label"?: string;
};

const Marquee = ({ children, className = "", reverse = false, pauseOnHover = false, repeat = 4, duration = 40, ...rest }: Props) => (
  <div
    className={`mq${reverse ? " mq-reverse" : ""}${pauseOnHover ? " mq-pause" : ""} ${className}`.trim()}
    style={{ "--duration": `${duration}s` } as React.CSSProperties}
    aria-label={rest["aria-label"]}
  >
    {Array.from({ length: repeat }, (_, i) => (
      <div key={i} className="mq-group" aria-hidden={i > 0 || undefined} inert={i > 0 || undefined}>
        {children}
      </div>
    ))}
  </div>
);

export default Marquee;
