import Image from "next/image";
import Link from "next/link";
import Section from "@/components/site/ds/Section";
import Icon, { type IconName } from "@/components/site/ds/Icon";
import OwnerTodo from "@/components/site/OwnerTodo";
import PostCard from "@/components/blog/PostCard";
import Marquee from "@/components/ui/Marquee";
import NumberTicker from "@/components/ui/NumberTicker";
import ServiceStack from "@/components/site/ServiceStack";
import { CardBody, CardContainer, CardItem } from "@/components/ui/Card3D";
import { DotPattern } from "@/components/ui/Patterns";
import Timeline from "@/components/ui/Timeline";
import HorizontalWork from "./HorizontalWork";
import { PROCESS } from "@/data/services";
import { IMAGE_BASE, PROJECTS } from "@/data/projects";
import { TOOLS } from "@/data/tools";
import { TESTIMONIALS } from "@/lib/testimonials";
import { getPosts } from "@/lib/blog";
import { SITE } from "@/lib/site";

/* ---------- Client wordmarks: Magic UI Marquee, brand names from the real reviews ---------- */
export const ClientWordmarks = () => (
  <section className="wordmarks" aria-label="Brands we built websites for" data-motion="self">
    <p className="wordmarks-label">
      <span className="u-label">Brands I&apos;ve built for</span>
    </p>
    <Marquee className="wordmarks-track" duration={46} pauseOnHover>
      {TESTIMONIALS.map((t) => (
        <span key={t.id} className="wordmark">
          {t.brand}
        </span>
      ))}
    </Marquee>
  </section>
);

/* ---------- Intro statement + real numbers (Magic UI Number Ticker) ---------- */
const STATS = [
  { value: 45, suffix: "+", label: "brands and clients served at Devrex Digital" },
  { value: 40, suffix: "+", label: "live websites shipped as the sole frontend developer" },
  { value: PROJECTS.length, suffix: "", label: "client projects in the portfolio" },
  { value: TESTIMONIALS.length, suffix: "", label: "client reviews, word for word" },
];

export const Statement = () => (
  <section className="statement-block">
    <DotPattern className="statement-dots" />
    <div className="statement-text">
      <h2 className="statement" data-words>
        Custom code, no templates. Websites that <span>load fast</span>, rank on Google and turn visitors into customers.
      </h2>
      <p className="statement-side" data-reveal="left">
        I&apos;m {SITE.name}, founder of {SITE.agency.name}. With my team I&apos;ve built websites and web apps for 45+ brands, from landing pages and online
        stores to admin dashboards and AI chatbots.{" "}
        <Link href="/about" className="x-link">
          About me <Icon name="arrow" size={16} />
        </Link>
      </p>
    </div>
    <dl className="stats" data-stagger>
      {STATS.map((s) => (
        <div key={s.label} className="stat">
          <dt>{s.label}</dt>
          <dd>
            <NumberTicker value={s.value} suffix={s.suffix} />
          </dd>
        </div>
      ))}
    </dl>
  </section>
);

/* ---------- Services: stacking cards (shared with /services) ---------- */
export const ServicesBento = () => (
  <Section label="Services" title={<>What I <span>build</span></>} text="Four services, one developer from the first call to launch. Prices are starting prices in USD.">
    <ServiceStack />
  </Section>
);

/* ---------- Selected work: pinned horizontal scroll of Aceternity 3D cards ---------- */
const FEATURED_WORK = ["dulhahouse", "nagina-jewels", "auraluxebags", "the-trekkerz-pakistan"];
const SHOTS: Record<string, [number, number]> = {
  dulhahouse: [1440, 1299],
  "nagina-jewels": [1440, 1177],
  auraluxebags: [1440, 1307],
  "the-trekkerz-pakistan": [1440, 1657],
};

export const SelectedWork = () => (
  <HorizontalWork
    head={
      <header className="x-section-head hwork-head">
        <span className="x-label">Selected work</span>
        <h2 className="x-h2">
          Client websites, <span>live and selling</span>
        </h2>
        <p className="x-lead">Built at {SITE.agency.name}, in projects I led. Hover a card to preview the real site.</p>
      </header>
    }
    after={
      <p className="hwork-more">
        <Link href="/work" className="page-btn page-btn-ghost">
          See all {PROJECTS.length} projects <Icon name="arrow" size={16} />
        </Link>
      </p>
    }
  >
    {FEATURED_WORK.map((slug) => PROJECTS.find((p) => p.slug === slug)!).map((p, i) => (
      <Link key={p.slug} href={`/work/${p.slug}`} className="work-card" data-cursor-label="View">
        <CardContainer>
          <CardBody>
            <CardItem translateZ={50} className="work-card-frame">
              <span className="work-card-bar" aria-hidden="true">
                <i />
                <i />
                <i />
                <em>{p.domain}</em>
              </span>
              {/* Hover scrolls the screenshot by the part hidden below the 16:10 frame. */}
              <span className="work-card-screen" style={{ "--work-shift": `${Math.max(0, (1 - (SHOTS[p.slug][0] * 10) / 16 / SHOTS[p.slug][1]) * 100).toFixed(1)}%` } as React.CSSProperties}>
                <Image src={`${IMAGE_BASE}${p.image}`} alt={`${p.title} website`} width={SHOTS[p.slug][0]} height={SHOTS[p.slug][1]} sizes="(max-width: 1023px) 92vw, 560px" />
              </span>
            </CardItem>
            <CardItem translateZ={30} className="work-card-text">
              <span className="work-card-num">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <h3>{p.title}</h3>
                <span className="work-card-label">{p.label}</span>
              </span>
              <span className="work-card-go" aria-hidden="true">
                <Icon name="arrow" size={18} />
              </span>
            </CardItem>
          </CardBody>
        </CardContainer>
      </Link>
    ))}
  </HorizontalWork>
);

/* ---------- How I work: Aceternity Timeline + photo ---------- */
export const HowIWork = () => (
  <Section label="How I work" title={<>A simple process, <span>from call to launch</span></>} text="The same four steps on every project, with 2 free revision rounds and 30 days of free bug fixes after launch.">
    <Timeline
      data={PROCESS.map((p, i) => ({
        kicker: String(i + 1).padStart(2, "0"),
        title: p.title,
        content: <p>{p.text}</p>,
      }))}
      aside={
        <figure className="process-photo">
          <span className="process-photo-frame">
            {/* The owner's working photo (blue shirt at a desk) goes here once it's provided; until then the headshot. */}
            <Image src={SITE.photo.src} alt={SITE.photo.alt} width={SITE.photo.width} height={SITE.photo.height} sizes="(max-width: 900px) 90vw, 420px" data-parallax />
          </span>
          <OwnerTodo what="Send the working photo (blue shirt at a desk). It replaces this headshot here and on /about." />
        </figure>
      }
    />
  </Section>
);

/* ---------- Free tools ---------- */
const TOOL_ICONS: Record<string, IconName> = { "free-seo-audit": "search", "website-cost-calculator": "tag", "chatbot-roi-calculator": "chart" };

export const FreeTools = () => (
  <Section label="Free tools" title={<>Try the work <span>before you hire</span></>} text="Free to use, no sign-up. The AI assistant in the corner is a working example of the chatbot service.">
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
