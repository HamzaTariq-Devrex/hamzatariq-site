import BotMark from "@/components/assistant/BotMark";
import { IMAGE_BASE } from "@/data/projects";
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

// What the SEO service sets up (its feature list), as a checklist; no scores.
const SEO_CHECKS = [
  "Real HTML on every URL",
  "Unique titles, descriptions and canonical URLs",
  "JSON-LD structured data",
  "Sitemap, robots.txt and IndexNow",
  "Core Web Vitals and images",
];

const SeoVisual = () => (
  <div className="x-visual x-visual-seo">
    <div className="x-checklist" role="img" aria-label="What the React and Next.js SEO service sets up">
      <p className="x-checklist-head">
        <Icon name="search" size={16} /> Technical SEO checklist
      </p>
      <ul>
        {SEO_CHECKS.map((c, i) => (
          <li key={c} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
            <span className="x-checklist-tick">
              <Icon name="check" size={14} />
            </span>
            {c}
          </li>
        ))}
      </ul>
    </div>
    <span className="x-chip x-chip-static">
      <Icon name="sparkle" size={16} /> Check your site with the free SEO audit
    </span>
  </div>
);

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
