import Image from "next/image";
import Link from "next/link";
import Section from "@/components/site/ds/Section";
import Icon, { type IconName } from "@/components/site/ds/Icon";
import OwnerTodo from "@/components/site/OwnerTodo";
import PostCard from "@/components/blog/PostCard";
import Marquee from "@/components/motion/Marquee";
import { PROCESS, SERVICES, formatPrice } from "@/data/services";
import { IMAGE_BASE, PROJECTS } from "@/data/projects";
import { TOOLS } from "@/data/tools";
import { OWN_SITE_RESULTS } from "@/data/ownSite";
import { TESTIMONIALS } from "@/lib/testimonials";
import { getPosts } from "@/lib/blog";
import { SITE } from "@/lib/site";

/* ---------- Client wordmarks (brands from the real reviews), slow marquee ---------- */
export const ClientWordmarks = () => (
  <section className="wordmarks" aria-label="Brands we built websites for">
    <p className="wordmarks-label">
      <span className="u-label">Trusted by {TESTIMONIALS.length}+ brands</span>
    </p>
    <Marquee className="wordmarks-track" trackClassName="wordmarks-rows" copyClassName="wordmarks-copy" speed={28}>
      <ul className="wordmarks-row">
        {TESTIMONIALS.map((t) => (
          <li key={t.id}>{t.brand}</li>
        ))}
      </ul>
    </Marquee>
  </section>
);

/* ---------- Intro statement in huge type ---------- */
export const Statement = () => (
  <section className="statement-block">
    <p className="statement">
      Custom code, no templates. Websites that <span>load fast</span>, rank on Google and turn visitors into customers.
    </p>
    <div className="statement-side" data-reveal>
      <p>
        I&apos;m {SITE.name}, founder of {SITE.agency.name}. With my team I&apos;ve built websites and web apps for 45+ brands, from landing pages and online
        stores to admin dashboards and AI chatbots.
      </p>
      <Link href="/about" className="page-btn page-btn-ghost">
        About me <Icon name="arrow" size={16} />
      </Link>
    </div>
  </section>
);

/* ---------- Services: four large rows; hover reveals price, summary and a mini visual ---------- */
const SERVICE_VISUAL: Record<string, React.ReactNode> = {
  "nextjs-websites": (
    <Image src={`${IMAGE_BASE}v2/dulhahouse.webp`} alt="" width={1440} height={1299} sizes="280px" className="services-shot" />
  ),
  dashboards: (
    <span className="services-bars" aria-hidden="true">
      {[42, 66, 50, 78, 60, 92].map((h, i) => (
        <i key={i} style={{ height: `${h}%` }} />
      ))}
    </span>
  ),
  "ai-chatbots": (
    <span className="services-chat" aria-hidden="true">
      <i className="is-user">Do you deliver abroad?</i>
      <i className="is-bot">Yes. I answer from your own pages, and pass the lead to you.</i>
    </span>
  ),
  "react-nextjs-seo": (
    <span className="services-score" aria-hidden="true">
      <strong>
        {OWN_SITE_RESULTS.seo.before} → {OWN_SITE_RESULTS.seo.after}
      </strong>
      <em>Mobile SEO score on my own site</em>
    </span>
  ),
};

export const ServiceRows = () => (
  <Section label="Services" title="What I build">
    <ol className="services-rows">
      {SERVICES.map((s, i) => (
        <li key={s.slug}>
          <Link href={`/services/${s.slug}`} className="services-row" data-cursor-label="View">
            <span className="services-num">{String(i + 1).padStart(2, "0")}</span>
            <h3>{s.name}</h3>
            <span className="services-meta">
              <span className="services-price">from {formatPrice(s.pricing[0])}</span>
              <span className="services-summary">{s.summary}</span>
            </span>
            <span className="services-visual" aria-hidden="true">
              {SERVICE_VISUAL[s.slug]}
            </span>
            <span className="services-arrow" aria-hidden="true">
              <Icon name="arrow" size={22} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  </Section>
);

/* ---------- Selected client work: big cards, the real screenshot scrolls on hover ---------- */
const FEATURED_WORK = ["dulhahouse", "nagina-jewels", "auraluxebags", "the-trekkerz-pakistan"];
const SHOTS: Record<string, [number, number]> = {
  dulhahouse: [1440, 1299],
  "nagina-jewels": [1440, 1177],
  auraluxebags: [1440, 1307],
  "the-trekkerz-pakistan": [1440, 1657],
};

export const SelectedWork = () => (
  <Section label="Selected work" title={<>Client websites, <span>live and selling</span></>} text={`Built at ${SITE.agency.name}, in projects I led. Hover to preview the real site.`}>
    <div className="work-big" data-stagger>
      {FEATURED_WORK.map((slug) => PROJECTS.find((p) => p.slug === slug)!).map((p) => (
        <Link key={p.slug} href={`/work/${p.slug}`} className="work-card" data-cursor-label="View">
          <div className="work-card-frame">
            <span className="work-card-bar" aria-hidden="true">
              <i />
              <i />
              <i />
              <em>{p.domain}</em>
            </span>
            {/* Hover scrolls the screenshot by the part hidden below the 16:10 frame. */}
            <div className="work-card-screen" style={{ "--work-shift": `${Math.max(0, (1 - (SHOTS[p.slug][0] * 10) / 16 / SHOTS[p.slug][1]) * 100).toFixed(1)}%` } as React.CSSProperties}>
              <Image src={`${IMAGE_BASE}${p.image}`} alt={`${p.title} website`} width={SHOTS[p.slug][0]} height={SHOTS[p.slug][1]} sizes="(max-width: 760px) 92vw, 600px" />
            </div>
          </div>
          <div className="work-card-text">
            <span className="work-card-label">{p.label}</span>
            <h3>{p.title}</h3>
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
        <Image src={SITE.photo.src} alt={SITE.photo.alt} width={SITE.photo.width} height={SITE.photo.height} sizes="(max-width: 900px) 90vw, 460px" />
        <OwnerTodo what="Send the working photo (blue shirt at a desk). It replaces this headshot here and on /about." />
      </figure>
      <ol className="process-steps" data-stagger>
        {PROCESS.map((p, i) => (
          <li key={p.title}>
            <span className="process-num">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3>{p.title}</h3>
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
          <span className="tool-icon">
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
