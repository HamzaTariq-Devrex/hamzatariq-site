// Section rhythm used on every page: small teal label, heading, short intro, then content.
type Props = {
  label: string;
  title: React.ReactNode;
  text?: React.ReactNode;
  id?: string;
  className?: string;
  center?: boolean;
  children: React.ReactNode;
};

const Section = ({ label, title, text, id, className = "", center = false, children }: Props) => (
  <section id={id} className={`x-section ${className}`.trim()}>
    <header className={`x-section-head${center ? " is-center" : ""}`} data-reveal>
      <span className="x-label">{label}</span>
      <h2 className="x-h2">{title}</h2>
      {text && <p className="x-lead">{text}</p>}
    </header>
    {children}
  </section>
);

export default Section;
