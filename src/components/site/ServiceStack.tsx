// The four services as a stack of large cards (home and /services). On desktop each card sticks under
// the header and the next one slides over it, while the covered card shrinks back and dims
// (`StackFx`, scroll-linked, transform/opacity only). On phones and with reduced motion it is a plain
// list. Each card: number, name, summary, three real features, starting price and delivery time from
// src/data/services.ts, and a visual: a real client screenshot (Dulhahouse), a dashboard wireframe
// with no figures, a chatbot exchange from the answer bank, and the SEO checklist (no scores).
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/site/ds/Icon";
import StackFx from "@/components/ui/StackFx";
import { SERVICES, formatPrice } from "@/data/services";
import { IMAGE_BASE } from "@/data/projects";

const SiteShot = () => (
  <span className="bento-browser">
    <span className="sstack-chip">
      <i aria-hidden="true" /> Client store · Built at Devrex Digital
    </span>
    <span className="bento-browser-bar" aria-hidden="true">
      <i />
      <i />
      <i />
      <em>dulhahouse.net</em>
    </span>
    <span className="bento-browser-screen">
      <Image src={`${IMAGE_BASE}v2/dulhahouse.webp`} alt="Dulhahouse store, built at Devrex Digital" width={1440} height={1299} sizes="(max-width: 900px) 90vw, 620px" />
    </span>
  </span>
);

const DashMini = () => (
  <span className="bento-dash" role="img" aria-label="Preview of a custom admin dashboard layout">
    <span className="bento-dash-side">
      {["Overview", "Orders", "Stock", "Customers"].map((l, i) => (
        <i key={l} className={i === 0 ? "is-on" : ""}>
          {l}
        </i>
      ))}
    </span>
    <span className="bento-dash-main">
      <span className="bento-dash-kpis">
        <i />
        <i />
        <i />
      </span>
      <span className="bento-dash-bars">
        {[38, 62, 45, 80, 56, 92, 70].map((h, i) => (
          <i key={i} style={{ height: `${h}%` }} />
        ))}
      </span>
    </span>
  </span>
);

const ChatMini = () => (
  <span className="bento-chat" role="img" aria-label="Example conversation with an AI chatbot">
    <i className="is-user">How much does an AI chatbot cost?</i>
    <i className="is-bot">An AI chatbot starts from $350 and usually takes 3–5 days.</i>
    <i className="is-user">Can it send leads to my WhatsApp?</i>
  </span>
);

const SeoMini = () => (
  <span className="bento-checks" role="img" aria-label="What the SEO service sets up">
    {["Real HTML on every URL", "Unique titles and descriptions", "JSON-LD structured data", "Sitemap, robots.txt and IndexNow", "Core Web Vitals checked"].map((c) => (
      <i key={c}>
        <Icon name="check" size={14} /> {c}
      </i>
    ))}
  </span>
);

const VISUALS: Record<string, React.ReactNode> = {
  "nextjs-websites": <SiteShot />,
  dashboards: <DashMini />,
  "ai-chatbots": <ChatMini />,
  "react-nextjs-seo": <SeoMini />,
};

/** `level`: heading level of the card titles (3 under a section h2, 2 directly under the page h1). */
const ServiceStack = ({ level = 3 }: { level?: 2 | 3 }) => (
  <StackFx className="sstack">
    {SERVICES.map((s, i) => (
      <li key={s.slug} className="sstack-card" style={{ "--i": i } as React.CSSProperties}>
        <Link href={`/services/${s.slug}`} className={`sstack-inner is-${i % 4}`} data-cursor-label="Open">
          <span className="sstack-text">
            <span className="sstack-bignum" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="sstack-top">
              <span className="sstack-num">
                {String(i + 1).padStart(2, "0")}
                <i> / {String(SERVICES.length).padStart(2, "0")}</i>
              </span>
              <span className="sstack-icon">
                <Icon name={s.icon} size={18} />
              </span>
            </span>
            <span className="sstack-title" role="heading" aria-level={level}>
              {s.name}
            </span>
            <span className="sstack-desc">{s.summary}</span>
            <span className="sstack-feats">
              {s.features.slice(0, 3).map((f) => (
                <span key={f}>
                  <Icon name="check" size={14} /> {f}
                </span>
              ))}
            </span>
            <span className="sstack-foot">
              <span className="sstack-price">
                <small>from</small> {formatPrice(s.pricing[0])}
                {s.pricing[0].timeline && <em>{s.pricing[0].timeline}</em>}
              </span>
              <span className="sstack-go">
                See the service <Icon name="arrow" size={16} />
              </span>
            </span>
          </span>
          <span className="sstack-visual">{VISUALS[s.slug]}</span>
          <span className="sstack-shade" aria-hidden="true" />
        </Link>
      </li>
    ))}
  </StackFx>
);

export default ServiceStack;
