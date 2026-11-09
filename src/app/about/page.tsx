import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiReact, SiNextdotjs, SiTypescript, SiTailwindcss, SiSupabase, SiNodedotjs, SiGooglegemini, SiVercel } from "react-icons/si";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import OwnerTodo from "@/components/site/OwnerTodo";
import Section from "@/components/site/ds/Section";
import CountUp from "@/components/site/ds/CountUp";
import Icon, { type IconName } from "@/components/site/ds/Icon";
import { Laptop, Phone } from "@/components/site/ds/Mockups";
import { PROCESS, SERVICES, formatPrice } from "@/data/services";
import { EDUCATION_HISTORY, JOBS } from "@/data/experience";
import WhereIWork from "@/components/site/WhereIWork";
import ReviewStrip from "@/components/site/ReviewStrip";
import { ABOUT_REVIEWS } from "@/lib/testimonials";
import { IMAGE_BASE, PROJECTS } from "@/data/projects";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Hamza Tariq, React and Next.js Developer",
  description:
    "Hamza Tariq is a React and Next.js developer and founder of Devrex Digital, building custom-coded websites, dashboards and AI chatbots for 45+ brands.",
  alternates: { canonical: "/about" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "About", item: `${SITE.url}/about` },
      ],
    },
    {
      "@type": "AboutPage",
      url: `${SITE.url}/about`,
      mainEntity: { "@id": `${SITE.url}/#person` },
    },
  ],
};

const STATS = [
  { value: 45, suffix: "+", label: "Brands served", note: `With my team at ${SITE.agency.name}` },
  { value: PROJECTS.length, suffix: "", label: "Projects in my portfolio", note: "Browse them on the work page" },
  { value: SERVICES.length, suffix: "", label: "Services", note: "Websites, dashboards, AI chatbots, SEO" },
  { value: 40, suffix: "+", label: "Live websites shipped", note: "As the sole frontend developer on each build" },
];

const devrex = JOBS.find((j) => j.company === "Devrex Digital")!;
const [bs, ics] = EDUCATION_HISTORY;

// My story, oldest first. Badges are text initials (owner: no company logos).
const STORY = [
  {
    when: ics.period,
    badge: "CS",
    title: ics.title,
    place: ics.school,
    text: "Where I started with code: computer science at intermediate level, before university.",
    todo: null,
  },
  {
    when: bs.period,
    badge: "AI",
    title: bs.title,
    place: bs.school,
    text: "A degree in artificial intelligence, the background behind the AI chatbots I build today.",
    todo: null,
  },
  { when: devrex.period, badge: "DD", title: devrex.role, place: devrex.company, text: devrex.body, todo: null },
  {
    when: "Now",
    badge: "HT",
    title: "Working directly with businesses",
    place: "hamzatariq.site",
    text: "Alongside Devrex Digital, I now work directly with business owners on Next.js websites, dashboards, AI chatbots and React SEO.",
    todo: null,
  },
];

const STACK = [
  { name: "React", Icon: SiReact, use: "Interfaces for every site and app" },
  { name: "Next.js", Icon: SiNextdotjs, use: "Fast, pre-rendered pages Google can read" },
  { name: "TypeScript", Icon: SiTypescript, use: "Safer code that's easier to change" },
  { name: "Tailwind CSS", Icon: SiTailwindcss, use: "Custom designs without template limits" },
  { name: "Supabase", Icon: SiSupabase, use: "Databases, logins and storage for dashboards" },
  { name: "Node.js", Icon: SiNodedotjs, use: "APIs and server logic" },
  { name: "Gemini / AI", Icon: SiGooglegemini, use: "AI chatbots that answer from your content" },
  { name: "Vercel", Icon: SiVercel, use: "Hosting with fast global delivery" },
];

const VALUES: { title: string; text: string; icon: IconName }[] = [
  { title: "Custom code, no templates", text: "Every site is designed and built around your business, not around what a theme allows.", icon: "code" },
  { title: "Built for speed", text: "Pre-rendered pages and optimised images, so your site loads fast on the phones your customers use.", icon: "speed" },
  { title: "SEO built in", text: "Titles, descriptions, sitemap and structured data on every page from day one.", icon: "search" },
  { title: "Direct communication", text: "You talk to me, the person building your project, from the first call to launch and after.", icon: "chat" },
];

const nagina = PROJECTS.find((p) => p.slug === "nagina-jewels")!;
const dulhahouse = PROJECTS.find((p) => p.slug === "dulhahouse")!;
const auraluxe = PROJECTS.find((p) => p.slug === "auraluxebags")!;
const trekkerz = PROJECTS.find((p) => p.slug === "the-trekkerz-pakistan")!;
// Real client projects only (owner: no own-site case study among client work).
const WORK = [
  {
    href: `/work/${dulhahouse.slug}`,
    title: dulhahouse.title,
    label: `${dulhahouse.label} · Built at ${SITE.agency.name}`,
    text: dulhahouse.description,
    desktop: { src: `${IMAGE_BASE}v2/dulhahouse.webp`, width: 1440, height: 1299 },
    mobile: { src: `${IMAGE_BASE}v2/dulhahouse-mobile.webp`, width: 780, height: 2118 },
    cta: "See the project",
  },
  {
    href: `/work/${nagina.slug}`,
    title: nagina.title,
    label: `${nagina.label} · Built at ${SITE.agency.name}`,
    text: nagina.description,
    desktop: { src: `${IMAGE_BASE}v2/nagina.webp`, width: 1440, height: 1177 },
    mobile: { src: `${IMAGE_BASE}v2/nagina-mobile.webp`, width: 780, height: 2302 },
    cta: "See the project",
  },
  {
    href: `/work/${auraluxe.slug}`,
    title: auraluxe.title,
    label: `${auraluxe.label} · Built at ${SITE.agency.name}`,
    text: auraluxe.description,
    desktop: { src: `${IMAGE_BASE}v2/auraluxebags.webp`, width: 1440, height: 1307 },
    mobile: { src: `${IMAGE_BASE}v2/auraluxebags-mobile.webp`, width: 780, height: 2194 },
    cta: "See the project",
  },
  {
    href: `/work/${trekkerz.slug}`,
    title: trekkerz.title,
    label: `${trekkerz.label} · Built at ${SITE.agency.name}`,
    text: trekkerz.description,
    desktop: { src: `${IMAGE_BASE}v2/trekkerz.webp`, width: 1440, height: 1657 },
    mobile: { src: `${IMAGE_BASE}v2/trekkerz-mobile.webp`, width: 780, height: 3622 },
    cta: "See the project",
  },
];

export default function AboutPage() {
  return (
    <SiteShell
      cta={{
        title: (
          <>
            Let&apos;s build something that brings you <span>customers</span>.
          </>
        ),
        text: "Tell me about your business and what you need. You'll get a clear plan and quote after a free call.",
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />

      <section className="x-hero x-about-hero">
        <div className="x-hero-text">
          <span className="x-badge">
            <i aria-hidden="true" /> Available for new projects
          </span>
          <h1 className="x-h1">
            Hi, I&apos;m <span>Hamza Tariq</span>
          </h1>
          <p className="x-role">{SITE.role}</p>
          <WhereIWork />
          <p className="x-hero-lead">{SITE.positioning}</p>
          <p className="x-hero-sub">{SITE.bio}</p>
          <div className="x-actions">
            <BookCall />
            <Link href="/work" className="page-btn page-btn-ghost">
              See my work
            </Link>
          </div>
        </div>
        <div className="x-portrait">
          <Image
            src={SITE.photo.src}
            alt={SITE.photo.alt}
            width={SITE.photo.width}
            height={SITE.photo.height}
            sizes="(max-width: 960px) 72vw, 420px"
            priority
          />
          {/* The owner's working photo (blue shirt at a desk) replaces this headshot once it's provided. */}
          <OwnerTodo what="Send the working photo (blue shirt at a desk) for /about and the home 'How I work' section." />
        </div>
      </section>

      <section className="x-stats" aria-label="In numbers">
        {STATS.map((s) => (
          <div key={s.label} className="x-stat" data-reveal>
            <strong>
              <CountUp value={s.value} suffix={s.suffix} />
            </strong>
            <span>{s.label}</span>
            <small>{s.note}</small>
          </div>
        ))}
      </section>

      <Section label="My story" title="From computer science to agency founder" text="How I got here, in four steps.">
        <ol className="x-timeline">
          {STORY.map((s) => (
            <li key={s.title} data-reveal>
              <span className="x-timeline-logo" aria-hidden="true">
                {s.badge}
              </span>
              <div className="x-timeline-card">
                <span className="x-timeline-when">{s.when ?? s.place}</span>
                <h3>{s.title}</h3>
                {s.when && <p className="x-timeline-place">{s.place}</p>}
                <p>{s.text}</p>
                {s.todo && <OwnerTodo what={s.todo} />}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="How I work" title="A simple process, from first call to launch" center>
        <ol className="x-steps">
          {PROCESS.map((p, i) => (
            <li key={p.title} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="x-step-icon">
                <Icon name={p.icon} />
              </span>
              <span className="x-step-num">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="Tech stack" title="The tools I build with" text="Modern, proven tools, chosen for speed, SEO and easy changes later.">
        <ul className="x-stack">
          {STACK.map(({ name, Icon: Logo, use }) => (
            <li key={name} tabIndex={0} data-reveal aria-label={`${name}: ${use}`}>
              <Logo aria-hidden="true" />
              <span>{name}</span>
              <span className="x-tip" role="tooltip">
                {use}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Why work with me" title="What you can count on">
        <div className="x-grid-4">
          {VALUES.map((v) => (
            <div key={v.title} className="x-card" data-reveal>
              <span className="x-card-icon">
                <Icon name={v.icon} />
              </span>
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </div>
          ))}
        </div>
        <div className="x-service-links" data-reveal>
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`}>
              <Icon name={s.icon} size={18} />
              {s.name}
              <small>from {formatPrice(s.pricing[0])}</small>
            </Link>
          ))}
        </div>
      </Section>

      <ReviewStrip
        reviews={ABOUT_REVIEWS}
        title={
          <>
            What clients <span>say</span>
          </>
        }
        text="Reviews posted on Instagram by brands whose websites I led at Devrex Digital. Word for word."
      />

      <Section label="Selected work" title="Recent projects" text="Client websites built at Devrex Digital, in projects I led.">
        <div className="x-work">
          {WORK.map((w) => (
            <Link key={w.href} href={w.href} className="x-work-item" data-reveal>
              <div className="x-work-visual">
                <Laptop src={w.desktop.src} alt={`${w.title}, desktop`} width={w.desktop.width} height={w.desktop.height} sizes="(max-width: 760px) 86vw, 380px" />
                <div className="x-work-phone">
                  <Phone src={w.mobile.src} alt={`${w.title}, mobile`} width={w.mobile.width} height={w.mobile.height} sizes="110px" />
                </div>
              </div>
              <span className="x-work-label">{w.label}</span>
              <h3>{w.title}</h3>
              <p>{w.text}</p>
              <span className="x-link">
                {w.cta} <Icon name="arrow" size={16} />
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </SiteShell>
  );
}
