// Turns a prospect's REAL audit result into plain-language findings, ranked by business impact:
// no website > not mobile friendly / very slow on mobile > no clear contact, WhatsApp or booking
// button > missing title or description on Google > the rest. Nothing here is invented: every
// finding maps to a failed or weak check (or a measured PageSpeed number) in that audit.
// Client-safe (used by emails, the report page and the WhatsApp queue).
import type { AuditResult, Check } from "@/lib/audit/types";

export type Finding = {
  id: string;
  /** Lower is more important. */
  rank: number;
  /** For emails: what it costs them, in one plain sentence fragment (no technical words). */
  cost: string;
  /** For the report page: a short title and the plain fix. */
  title: string;
  fix: string;
};

const check = (a: AuditResult, id: string): Check | undefined => a.checks.find((c) => c.id === id);
const bad = (c?: Check) => c?.status === "fail" || c?.status === "warn";

/** Seconds until the main content shows on a phone (Lighthouse LCP, mobile), when it was measured. */
export const mobileSeconds = (a: AuditResult | null) => {
  const m = a?.pagespeed?.lab.find((x) => x.label === "Largest Contentful Paint")?.value ?? a?.pagespeed?.field.find((x) => x.label === "Largest Contentful Paint")?.value;
  const s = m ? Number.parseFloat(m.replace(",", ".")) : NaN;
  return Number.isFinite(s) ? Math.round(s * 10) / 10 : null;
};

export const findings = (a: AuditResult | null, ctx: { noun: string; city: string | null; bookings?: boolean }): Finding[] => {
  const where = ctx.city ? ` in ${ctx.city}` : "";
  const article = /^[aeiou]/i.test(ctx.noun) ? "an" : "a";
  if (!a) {
    return [
      {
        id: "no-website",
        rank: 0,
        cost: `I couldn't find a website for you, so people searching for ${article} ${ctx.noun}${where} on Google find other places first`,
        title: "No website found",
        fix: "A simple, fast site with your services, opening hours, location and a call or WhatsApp button, so people who search for you can get in touch.",
      },
    ];
  }
  const out: Finding[] = [];
  const secs = mobileSeconds(a);
  if (check(a, "viewport")?.status === "fail") {
    out.push({
      id: "not-mobile",
      rank: 1,
      cost: "your website isn't set up for phones, so it shows up tiny and hard to use on the screen where most people look you up",
      title: "Hard to use on a phone",
      fix: "Make the site resize to fit phones, with text you can read and buttons you can tap without zooming.",
    });
  }
  if (secs !== null && secs >= 4) {
    out.push({
      id: "slow-mobile",
      rank: 1.5,
      cost: `your homepage takes ${secs} seconds to open on a phone, and most people leave before that`,
      title: `Takes ${secs} seconds to open on a phone`,
      fix: "Shrink the large images and remove heavy scripts so the page opens in about 2 seconds on a phone.",
    });
  }
  if (a.extras && !a.extras.hasContactButton) {
    out.push({
      id: "no-contact",
      rank: 2,
      // "book" only for niches that take bookings; shops and offices get call or WhatsApp.
      cost: ctx.bookings
        ? "there's no quick way to call, WhatsApp or book from your homepage, so visitors who are ready to get in touch have to hunt for it"
        : "there's no quick way to call or WhatsApp you from your homepage, so visitors who are ready to get in touch have to hunt for it",
      title: "No quick way to get in touch",
      fix: ctx.bookings
        ? "Add a clear call, WhatsApp or booking button at the top of the homepage, visible without scrolling on a phone."
        : "Add a clear call or WhatsApp button at the top of the homepage, visible without scrolling on a phone.",
    });
  }
  if (bad(check(a, "title"))) {
    out.push({
      id: "title",
      rank: 3,
      cost: `Google shows your site without a proper title, so people searching for ${article} ${ctx.noun}${where} skip past it`,
      title: "No proper title on Google",
      fix: `Give the homepage a clear title with what you do and where, for example "${ctx.noun[0].toUpperCase()}${ctx.noun.slice(1)}${where}", so it stands out in Google results.`,
    });
  }
  if (bad(check(a, "description"))) {
    out.push({
      id: "description",
      rank: 3.5,
      cost: "Google has no short summary of what you offer to show under your name, so your listing looks empty next to others",
      title: "No summary under your name on Google",
      fix: "Write a one-line summary of what you offer and why people choose you, so Google shows it under your name.",
    });
  }
  if (check(a, "noindex")?.status === "fail") {
    out.push({
      id: "hidden",
      rank: 2.5,
      cost: "your homepage tells Google not to list it, so it can't show up when people search for you",
      title: "Hidden from Google",
      fix: "Remove the setting that tells Google not to list the homepage.",
    });
  }
  if (check(a, "https")?.status === "fail") {
    out.push({
      id: "not-secure",
      rank: 4,
      cost: "browsers show your site as \"Not secure\", which puts visitors off before they read anything",
      title: "Marked \"Not secure\" by browsers",
      fix: "Switch the site to a secure address (the padlock), which most hosts offer for free.",
    });
  }
  if (check(a, "ssr")?.status === "fail") {
    out.push({
      id: "empty-page",
      rank: 4.5,
      cost: "Google sees an almost empty page when it visits, so it has little to show people who search for you",
      title: "Google sees an almost empty page",
      fix: "Make sure the homepage text is part of the page itself, not loaded in later, so Google can read it.",
    });
  }
  if (check(a, "og")?.status === "fail") {
    out.push({
      id: "no-preview",
      rank: 5,
      cost: "when someone shares your site on WhatsApp or Instagram, the link shows no picture or title",
      title: "Shared links show no picture",
      fix: "Add a share picture, title and summary so links look good on WhatsApp, Instagram and Facebook.",
    });
  }
  if (check(a, "h1")?.status === "fail") {
    out.push({
      id: "no-headline",
      rank: 6,
      cost: "your homepage has no main headline saying what you do, which makes it harder for Google and visitors to tell at a glance",
      title: "No main headline",
      fix: "Add one clear headline at the top of the homepage that says what you do and where.",
    });
  }
  return out.sort((x, y) => x.rank - y.rank);
};
