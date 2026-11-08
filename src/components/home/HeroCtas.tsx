"use client";

import Link from "next/link";
import BookCall from "@/components/site/BookCall";
import Magnetic from "@/components/motion/Magnetic";
import Icon from "@/components/site/ds/Icon";
import { SEO_AUDIT_TOOL } from "@/data/tools";
import { trackEvent } from "@/lib/analytics";

/** Hero buttons: Book a free call (magnetic) and the free SEO audit (tracked as a home entry point). */
const HeroCtas = () => (
  <div className="hero-ctas">
    <Magnetic>
      <BookCall icon={<Icon name="arrow" size={16} />} />
    </Magnetic>
    <Link href={SEO_AUDIT_TOOL.href} className="page-btn page-btn-ghost" onClick={() => trackEvent("audit_cta_click", { location: "home" })}>
      Free SEO audit
      <span className="hero-free">Free</span>
    </Link>
  </div>
);

export default HeroCtas;
