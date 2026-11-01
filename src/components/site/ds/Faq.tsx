import type { Faq as FaqItem } from "@/data/services";

/** FAQ accordion (native <details>, so it works without JS). Pair it with FAQPage JSON-LD on the page. */
const Faq = ({ items }: { items: FaqItem[] }) => (
  <div className="x-faq">
    {items.map((f) => (
      <details key={f.q} data-reveal>
        <summary>
          <h3>{f.q}</h3>
          <span className="x-faq-icon" aria-hidden="true" />
        </summary>
        <div className="x-faq-body">
          <p>{f.a}</p>
        </div>
      </details>
    ))}
  </div>
);

export default Faq;
