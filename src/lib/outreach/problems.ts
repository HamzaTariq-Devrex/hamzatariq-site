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
      cost: "your website isn't set up for phones, so on a phone it opens zoomed out, with small text people have to pinch to read",
      title: "Hard to use on a phone",
      fix: "Make the site resize to fit phones, with text you can read and buttons you can tap without zooming.",
    });
  }
  if (secs !== null && secs >= 4) {
    out.push({
      id: "slow-mobile",
      rank: 1.5,
      cost: `in Google's phone test your homepage took ${secs} seconds to show its main content, and some visitors give up before a slow page loads`,
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
        ? "your homepage has no call, WhatsApp or booking button, so visitors who are ready to get in touch have to look for your details"
        : "your homepage has no call or WhatsApp button, so visitors who are ready to get in touch have to look for your details",
      title: "No quick way to get in touch",
      fix: ctx.bookings
        ? "Add a clear call, WhatsApp or booking button at the top of the homepage, visible without scrolling on a phone."
        : "Add a clear call or WhatsApp button at the top of the homepage, visible without scrolling on a phone.",
    });
  }
  // Owner, 2026-11-18: every line must be literally true. A missing title/description and a
  // too long/short one are different problems with different wording.
  const title = check(a, "title");
  const titleLen = Number(title?.detail?.match(/\((\d+) characters\)/)?.[1] ?? NaN);
  if (title?.status === "fail") {
    out.push({
      id: "title",
      rank: 3,
      cost: "your homepage has no title, so Google has to make up the headline it shows for you in search results",
      title: "No title for Google to show",
      fix: `Give the homepage a clear title with what you do and where, for example "${ctx.noun[0].toUpperCase()}${ctx.noun.slice(1)}${where}".`,
    });
  } else if (title?.status === "warn") {
    out.push(
      titleLen > 65
        ? {
            id: "title",
            rank: 3.2,
            cost: "your homepage title is too long, so Google cuts it off in search results",
            title: "Title cut off on Google",
            fix: "Shorten the homepage title to about 60 characters, with what you do and where first.",
          }
        : {
            id: "title",
            rank: 3.2,
            cost: `your homepage title is only a few words, so it doesn't tell people searching for ${article} ${ctx.noun}${where} what you do or where you are`,
            title: "Title too short to say what you do",
            fix: `Make the homepage title say what you do and where, for example "${ctx.noun[0].toUpperCase()}${ctx.noun.slice(1)}${where}".`,
          },
    );
  }
  const desc = check(a, "description");
  const descLen = Number(desc?.detail?.match(/^(\d+) characters/)?.[1] ?? NaN);
  if (desc?.status === "fail") {
    out.push({
      id: "description",
      rank: 3.5,
      // Google writes its own snippet when there's no description (never "empty").
      cost: "Google picks a random line from your page to show under your name, instead of a line that sells you",
      title: "No summary of your own under your name on Google",
      fix: "Write a one-line summary of what you offer and why people choose you, so Google can show it under your name.",
    });
  } else if (desc?.status === "warn") {
    out.push(
      descLen > 170
        ? {
            id: "description",
            rank: 3.7,
            cost: "the summary you wrote for Google is too long, so it gets cut off under your name in search results",
            title: "Summary cut off on Google",
            fix: "Shorten the summary to about 155 characters, with the most important line first.",
          }
        : {
            id: "description",
            rank: 3.7,
            cost: "the summary you wrote for Google is very short, so the line under your name says little about what you offer",
            title: "Summary too short",
            fix: "Write a fuller one-line summary (about 150 characters) of what you offer and why people choose you.",
          },
    );
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
      cost: "browsers mark your site as \"Not secure\", which can put visitors off",
      title: "Marked \"Not secure\" by browsers",
      fix: "Switch the site to a secure address (the padlock), which most hosts offer for free.",
    });
  }
  if (check(a, "ssr")?.status === "fail") {
    out.push({
      id: "empty-page",
      rank: 4.5,
      cost: "most of your homepage text is added by scripts after the page opens, so link previews and some search engines see an almost empty page",
      title: "Search engines may see an almost empty page",
      fix: "Make sure the homepage text is part of the page itself, not loaded in later, so Google can read it.",
    });
  }
  if (check(a, "og")?.status === "fail") {
    out.push({
      id: "no-preview",
      rank: 5,
      cost: "when someone shares your site on WhatsApp or Facebook, the link shows no preview picture",
      title: "Shared links show no picture",
      fix: "Add a share picture, title and summary so links look good on WhatsApp, Instagram and Facebook.",
    });
  }
  if (check(a, "h1")?.status === "fail") {
    out.push({
      id: "no-headline",
      rank: 6,
      cost: "your homepage doesn't tell Google which line is its main headline, so Google has to guess what the page is about",
      title: "No main headline for Google",
      fix: "Add one clear headline at the top of the homepage that says what you do and where.",
    });
  }
  return out.sort((x, y) => x.rank - y.rank);
};
