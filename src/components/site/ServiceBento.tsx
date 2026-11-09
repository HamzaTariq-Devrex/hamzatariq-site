// The four services as an Aceternity Bento Grid (ui/BentoGrid) with a real visual per service:
// a real client screenshot (Dulhahouse), a dashboard wireframe with no figures, a chatbot exchange
// taken from the answer bank, and the SEO service's checklist (no scores). Used on / and /services.
import Image from "next/image";
import Icon from "@/components/site/ds/Icon";
import { BentoGrid, BentoGridItem } from "@/components/ui/BentoGrid";
import { SERVICES, formatPrice } from "@/data/services";
import { IMAGE_BASE } from "@/data/projects";

const SiteShot = () => (
  <span className="bento-browser" data-clip>
    <span className="bento-browser-bar" aria-hidden="true">
      <i />
      <i />
      <i />
      <em>dulhahouse.net</em>
    </span>
    <span className="bento-browser-screen">
      <Image src={`${IMAGE_BASE}v2/dulhahouse.webp`} alt="Dulhahouse store, built at Devrex Digital" width={1440} height={1299} sizes="(max-width: 900px) 90vw, 640px" data-parallax />
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

const BENTO: Record<string, { header: React.ReactNode; wide?: boolean }> = {
  "nextjs-websites": { header: <SiteShot />, wide: true },
  dashboards: { header: <DashMini /> },
  "ai-chatbots": { header: <ChatMini /> },
  "react-nextjs-seo": { header: <SeoMini />, wide: true },
};

const ServiceBento = () => (
  <BentoGrid>
    {SERVICES.map((s) => (
      <BentoGridItem
        key={s.slug}
        href={`/services/${s.slug}`}
        wide={BENTO[s.slug]?.wide}
        header={BENTO[s.slug]?.header}
        icon={<Icon name={s.icon} size={18} />}
        title={s.name}
        description={s.summary}
        meta={
          <>
            from {formatPrice(s.pricing[0])}
            {s.pricing[0].timeline ? ` · ${s.pricing[0].timeline}` : ""}
            <Icon name="arrow" size={16} />
          </>
        }
      />
    ))}
  </BentoGrid>
);

export default ServiceBento;
