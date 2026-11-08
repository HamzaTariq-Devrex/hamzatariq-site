import Image from "next/image";
import Link from "next/link";
import Section from "@/components/site/ds/Section";
import Icon, { type IconName } from "@/components/site/ds/Icon";
import { Laptop, Phone } from "@/components/site/ds/Mockups";
import OwnerTodo from "@/components/site/OwnerTodo";
import PostCard from "@/components/blog/PostCard";
import { PROCESS, SERVICES, formatPrice } from "@/data/services";
import { IMAGE_BASE, PROJECTS } from "@/data/projects";
import { TOOLS } from "@/data/tools";
import { OWN_SITE_RESULTS } from "@/data/ownSite";
import { getPosts } from "@/lib/blog";
import { SITE } from "@/lib/site";

/* ---------- Services bento ---------- */
const SERVICE_VISUAL: Record<string, React.ReactNode> = {
  "nextjs-websites": (
    <div className="bento-shot">
      <Image src={`${IMAGE_BASE}v2/dulhahouse.webp`} alt="Dulhahouse store built in Next.js" width={1440} height={1299} sizes="(max-width: 760px) 90vw, 520px" />
    </div>
  ),
  dashboards: (
    <div className="bento-bars" aria-hidden="true">
      {[42, 66, 50, 78, 60, 92].map((h, i) => (
        <span key={i} style={{ height: `${h}%` }} />
      ))}
    </div>
  ),
  "ai-chatbots": (
    <div className="bento-chat" aria-hidden="true">
      <span className="is-user">Do you deliver abroad?</span>
      <span className="is-bot">Yes, I can answer that from your own pages, and pass the lead to you.</span>
    </div>
  ),
  "react-nextjs-seo": (
    <div className="bento-score" aria-hidden="true">
      <strong>
        {OWN_SITE_RESULTS.seo.before} <em>→</em> {OWN_SITE_RESULTS.seo.after}
      </strong>
      <span>Mobile SEO score on my own site</span>
    </div>
  ),
};

export const ServicesBento = () => (
  <Section label="Services" title={<>Four ways I help your business <span>grow online</span></>} text="Custom code, no templates. Clear starting prices, and every project is quoted after a free call.">
    <div className="bento" data-stagger>
      {SERVICES.map((s, i) => (
        <Link key={s.slug} href={`/services/${s.slug}`} className={`bento-card is-${i}`}>
          <div className="bento-top">
            <span className="bento-icon">
              <Icon name={s.icon} size={20} />
            </span>
            <span className="bento-price">from {formatPrice(s.pricing[0])}</span>
          </div>
          <h3>{s.name}</h3>
          <p>{s.summary}</p>
          {SERVICE_VISUAL[s.slug]}
          <span className="x-link">
            Explore <Icon name="arrow" size={16} />
          </span>
        </Link>
      ))}
    </div>
  </Section>
);

/* ---------- Selected client work (real screenshots in device frames) ---------- */
const FEATURED_WORK = ["dulhahouse", "nagina-jewels", "auraluxebags", "the-trekkerz-pakistan"];
const SHOTS: Record<string, { desktop: [number, number]; mobile: [number, number] }> = {
  dulhahouse: { desktop: [1440, 1299], mobile: [780, 2118] },
  "nagina-jewels": { desktop: [1440, 1177], mobile: [780, 2302] },
  auraluxebags: { desktop: [1440, 1307], mobile: [780, 2194] },
  "the-trekkerz-pakistan": { desktop: [1440, 1657], mobile: [780, 3622] },
};

export const SelectedWork = () => (
  <Section label="Selected work" title={<>Client websites, <span>live and selling</span></>} text={`Built at ${SITE.agency.name}, in projects I led. Real screenshots of real stores.`}>
    <div className="work-grid" data-stagger>
      {FEATURED_WORK.map((slug) => PROJECTS.find((p) => p.slug === slug)!).map((p) => (
        <Link key={p.slug} href={`/work/${p.slug}`} className="work-tile">
          <div className="work-tile-visual">
            <Laptop src={`${IMAGE_BASE}${p.image}`} alt={`${p.title} website on desktop`} width={SHOTS[p.slug].desktop[0]} height={SHOTS[p.slug].desktop[1]} sizes="(max-width: 760px) 80vw, 460px" />
            {p.mobileImage && (
              <div className="work-tile-phone">
                <Phone src={`${IMAGE_BASE}${p.mobileImage}`} alt={`${p.title} website on mobile`} width={SHOTS[p.slug].mobile[0]} height={SHOTS[p.slug].mobile[1]} sizes="120px" />
              </div>
            )}
          </div>
          <div className="work-tile-text">
            <span className="work-tile-label">{p.label}</span>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
          </div>
        </Link>
      ))}
    </div>
    <p className="section-more">
      <Link href="/work" className="page-btn page-btn-ghost">
        See all {PROJECTS.length} projects <Icon name="arrow" size={16} />
      </Link>
    </p>
  </Section>
);

/* ---------- How I work ---------- */
export const HowIWork = () => (
  <Section label="How I work" title={<>A simple process, <span>from call to launch</span></>}>
    <div className="process">
      <figure className="process-photo" data-reveal>
        {/* The owner's working photo (blue shirt at a desk) goes here once it's provided; until then the headshot. */}
        <Image src={SITE.photo.src} alt={SITE.photo.alt} width={SITE.photo.width} height={SITE.photo.height} sizes="(max-width: 900px) 90vw, 420px" />
        <OwnerTodo what="Send the working photo (blue shirt at a desk). It replaces this headshot here and on /about." />
      </figure>
      <ol className="process-steps" data-stagger>
        {PROCESS.map((p, i) => (
          <li key={p.title}>
            <span className="process-num">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3>
                <Icon name={p.icon as IconName} size={18} /> {p.title}
              </h3>
              <p>{p.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </Section>
);

/* ---------- Free tools ---------- */
const TOOL_ICONS: Record<string, IconName> = { "free-seo-audit": "search", "website-cost-calculator": "tag", "chatbot-roi-calculator": "chart" };

export const FreeTools = () => (
  <Section label="Free tools" title={<>Try the work <span>before you hire</span></>} text="Built and run on this site. No sign-up.">
    <div className="tools-row" data-stagger>
      {TOOLS.map((t) => (
        <Link key={t.slug} href={t.href} className="tool-tile">
          <span className="bento-icon">
            <Icon name={TOOL_ICONS[t.slug] ?? "sparkle"} size={20} />
          </span>
          <h3>{t.name}</h3>
          <p>{t.summary}</p>
          <span className="x-link">
            Open the tool <Icon name="arrow" size={16} />
          </span>
        </Link>
      ))}
    </div>
  </Section>
);

/* ---------- Latest blog posts ---------- */
export const LatestPosts = () => {
  const posts = getPosts().slice(0, 3);
  if (!posts.length) return null;
  return (
    <Section label="Blog" title={<>Practical guides, <span>from real projects</span></>}>
      <div className="post-grid home-posts" data-stagger>
        {posts.map((p) => (
          <PostCard key={p.slug} post={p} />
        ))}
      </div>
      <p className="section-more">
        <Link href="/blog" className="page-btn page-btn-ghost">
          Read the blog <Icon name="arrow" size={16} />
        </Link>
      </p>
    </Section>
  );
};
