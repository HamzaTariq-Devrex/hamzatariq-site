import { timingSafeEqual } from "node:crypto";

/** Vercel Cron and the GitHub Actions tick send `Authorization: Bearer $CRON_SECRET`. */
export const cronAuthorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
