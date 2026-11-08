import BotMark from "@/components/assistant/BotMark";
import { IMAGE_BASE } from "@/data/projects";
import { OWN_SITE_RESULTS } from "@/data/ownSite";
import { Browser, Phone } from "./Mockups";
import Icon from "./Icon";

// The visual on the right of each service hero. Real screenshots and real numbers only; the
// dashboard preview is an abstract wireframe with no figures, so it can't suggest invented data.

const SiteVisual = () => (
  <div className="x-visual x-visual-site">
    <Browser
      src={`${IMAGE_BASE}v2/dulhahouse.webp`}
      alt="Dulhahouse ecommerce store built at Devrex Digital, desktop"
      width={1440}
      height={1299}
      url="dulhahouse.net"
      sizes="(max-width: 960px) 86vw, 520px"
      priority
    />
    <div className="x-visual-phone">
      <Phone src={`${IMAGE_BASE}v2/dulhahouse-mobile.webp`} alt="Dulhahouse store on mobile" width={780} height={2118} sizes="150px" />
    </div>
    <span className="x-chip x-float" style={{ top: "10%", left: "-4%" }}>
      <Icon name="speed" size={16} /> Pre-rendered pages
    </span>
    <span className="x-chip x-float is-late" style={{ bottom: "14%", left: "6%" }}>
      <Icon name="search" size={16} /> SEO-ready from day one
    </span>
  </div>
);

const DashboardVisual = () => (
  <div className="x-visual x-visual-dash" role="img" aria-label="Preview of a custom admin dashboard layout">
    <div className="x-dash">
      <aside>
        <span className="x-dash-logo" />
        {["Overview", "Orders", "Stock", "Customers"].map((l, i) => (
          <span key={l} className={i === 0 ? "is-on" : ""}>
            {l}
          </span>
        ))}
      </aside>
      <div className="x-dash-main">
        <div className="x-dash-kpis">
          {["Orders", "Stock", "Customers"].map((l) => (
            <div key={l}>
              <small>{l}</small>
              <i />
            </div>
          ))}
        </div>
        <div className="x-dash-chart">
          {[38, 62, 45, 80, 56, 92, 70].map((h, i) => (
            <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="x-dash-rows">
          {[0, 1, 2].map((r) => (
            <div key={r}>
              <i />
              <i />
              <b />
            </div>
          ))}
        </div>
      </div>
    </div>
    <span className="x-chip x-float" style={{ top: "-4%", right: "6%" }}>
      <Icon name="lock" size={16} /> Secure team logins
    </span>
  </div>
);

// Questions and answers from the AI chatbot service page and the answer bank.
const CHAT = [
  { who: "user", text: "How much does an AI chatbot cost?" },
  { who: "bot", text: "An AI chatbot starts from $350 and usually takes 3–5 days." },
  { who: "user", text: "Can it send leads to my WhatsApp?" },
  { who: "bot", text: "Yes. It can hand visitors over to WhatsApp or collect their details for you." },
] as const;

const ChatVisual = () => (
  <div className="x-visual x-visual-chat">
    <div className="x-chatdemo" role="img" aria-label="Example conversation with an AI chatbot">
      <div className="x-chatdemo-head">
        <BotMark size={36} />
        <div>
          <strong>Hamza&apos;s AI</strong>
          <small>Answers from this site</small>
        </div>
      </div>
      <div className="x-chatdemo-body">
        {CHAT.map((m, i) => (
          <p key={i} className={`is-${m.who}`} style={{ animationDelay: `${0.2 + i * 0.3}s` }}>
            {m.text}
          </p>
        ))}
        <span className="x-chatdemo-typing" style={{ animationDelay: `${0.2 + CHAT.length * 0.3}s` }}>
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
    <span className="x-chip x-float" style={{ bottom: "8%", left: "-6%" }}>
      <Icon name="leads" size={16} /> Leads to WhatsApp or email
    </span>
  </div>
);

const Ring = ({ value, label, note }: { value: number; label: string; note: string }) => (
  <div className="x-ring">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="52" className="x-ring-track" />
      <circle cx="60" cy="60" r="52" className="x-ring-value" style={{ "--v": value } as React.CSSProperties} />
    </svg>
    <strong>{value}</strong>
    <span>{label}</span>
    <small>{note}</small>
  </div>
);

const SeoVisual = () => {
  const { seo, lcp, projectPerformance: pages, workPerformance: work } = OWN_SITE_RESULTS;
  return (
    <div className="x-visual x-visual-seo">
      <div className="x-rings" role="img" aria-label={`Mobile Lighthouse after the Next.js migration of hamzatariq.site: SEO ${seo.after}, performance ${pages.after} on project pages and ${work.after} on /work`}>
        <Ring value={Number(seo.after)} label="SEO" note={`Home, was ${seo.before}`} />
        <Ring value={Number(pages.after)} label="Performance" note={`Project pages, was ${pages.before}`} />
        <Ring value={Number(work.after)} label="Performance" note={`/work, was ${work.before}`} />
      </div>
      <span className="x-chip x-chip-static">
        <Icon name="speed" size={16} /> On my own site: home LCP {lcp.before} → {lcp.after}
      </span>
    </div>
  );
};

const VISUALS: Record<string, () => React.ReactElement> = {
  "nextjs-websites": SiteVisual,
  dashboards: DashboardVisual,
  "ai-chatbots": ChatVisual,
  "react-nextjs-seo": SeoVisual,
};

const HeroVisual = ({ slug }: { slug: string }) => {
  const Visual = VISUALS[slug];
  return Visual ? <Visual /> : null;
};

export default HeroVisual;
