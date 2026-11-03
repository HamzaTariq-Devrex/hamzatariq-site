"use client";

// "Check my site" entry point to the free SEO audit: a plain GET form to /tools/free-seo-audit?url=…,
// which starts the audit on load. A real form (not client navigation) works without JS and gives the
// home page the full page load it needs (see CLAUDE.md). Styles are self-contained (AuditCta.css),
// because the home page doesn't load the design-system CSS.
import { useId } from "react";
import { SEO_AUDIT_TOOL, type AuditCtaLocation } from "@/data/tools";
import { trackEvent } from "@/lib/analytics";
import "../styles/AuditCta.css";

type Props = {
  location: AuditCtaLocation;
  /** "band": large home section; "box": compact card inside pages and posts. */
  variant?: "band" | "box";
  title?: string;
  text?: string;
  /** Use an <h2> for the title (sections); boxes inside articles use a styled <p>. */
  heading?: boolean;
};

const AuditCta = ({
  location,
  variant = "box",
  title = "Free SEO audit: see what's stopping your site from ranking",
  text = "Enter your website to get a score out of 100 and a fix list, checked the way Google reads your page. Free, no sign-up.",
  heading = false,
}: Props) => {
  const id = useId();
  const Title = heading ? "h2" : "p";
  return (
    <section className={`acta acta-${variant}`} aria-labelledby={`${id}-title`}>
      <span className="acta-label">
        <span className="acta-badge">Free</span> SEO audit tool
      </span>
      <Title id={`${id}-title`} className="acta-title">
        {title}
      </Title>
      <p className="acta-text">{text}</p>
      <form
        className="acta-form"
        action={SEO_AUDIT_TOOL.href}
        method="get"
        onSubmit={() => trackEvent("audit_cta_click", { location })}
      >
        <label htmlFor={`${id}-url`} className="acta-sr">
          Your website address
        </label>
        <input id={`${id}-url`} name="url" type="text" inputMode="url" autoComplete="url" placeholder="yourwebsite.com" maxLength={500} required data-cursor="disable" />
        <button type="submit" data-cursor="disable">
          Check my site
        </button>
      </form>
    </section>
  );
};

export default AuditCta;
