// Bento Grid, ported from Aceternity UI (ui.aceternity.com/components/bento-grid): a 3-column grid of
// cards with a visual header, an icon, a title and a description that nudges right on hover. Cards
// can span 2 columns (`wide`). Here each card is a real link. CSS in Ui.css (`.bento`).
import Link from "next/link";

export const BentoGrid = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bento ${className}`.trim()} data-stagger>
    {children}
  </div>
);

type ItemProps = {
  href: string;
  title: React.ReactNode;
  description: React.ReactNode;
  header: React.ReactNode;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  wide?: boolean;
  className?: string;
};

export const BentoGridItem = ({ href, title, description, header, icon, meta, wide = false, className = "" }: ItemProps) => (
  <Link href={href} className={`bento-item${wide ? " is-wide" : ""} ${className}`.trim()} data-cursor-label="View">
    <div className="bento-header">{header}</div>
    <div className="bento-body">
      {icon && <span className="bento-icon">{icon}</span>}
      <h3 className="bento-title">{title}</h3>
      <p className="bento-desc">{description}</p>
      {meta && <span className="bento-meta">{meta}</span>}
    </div>
  </Link>
);
