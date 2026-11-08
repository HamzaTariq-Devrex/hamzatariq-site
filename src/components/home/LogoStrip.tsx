import Marquee from "@/components/motion/Marquee";
import { LOGO_REVIEWS } from "@/lib/testimonials";

/**
 * Real client logos under the hero, scrolling slowly (pauses on hover). Server-rendered; the Marquee
 * island clones the row in the browser for a seamless loop. With reduced motion the row wraps.
 */
const LogoStrip = () => (
  <section className="logo-strip" aria-label="Brands we built for">
    <p className="logo-strip-label">Websites and stores built for brands like</p>
    <Marquee className="logo-strip-track" trackClassName="logo-strip-rows" copyClassName="logo-strip-copy">
      <ul className="logo-strip-row">
        {LOGO_REVIEWS.map((t) => (
          <li key={t.id}>
            {/* 112px WebP logos: a plain lazy <img> keeps the HTML small (next/image adds a srcset per logo). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.logo.src} alt={t.brand} width={48} height={48} loading="lazy" decoding="async" />
          </li>
        ))}
      </ul>
    </Marquee>
  </section>
);

export default LogoStrip;
