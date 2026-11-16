// SEO autopilot fix queue (docs/SEO_AUTOPILOT.md), through the secured API on the live site.
//   node scripts/seo-autopilot/queue.mjs list [limit]             fixes to apply now (JSON on stdout)
//   node scripts/seo-autopilot/queue.mjs done <id> <commit> [note]
//   node scripts/seo-autopilot/queue.mjs failed <id> "<why>"      retried up to 3 times, then shown as failed
// Needs CRON_SECRET (same value as Vercel). SEO_API_BASE overrides https://hamzatariq.site.
import { existsSync } from "node:fs";
import { join } from "node:path";

if (existsSync(join(process.cwd(), ".env.local"))) process.loadEnvFile(join(process.cwd(), ".env.local"));

const BASE = process.env.SEO_API_BASE || "https://hamzatariq.site";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

const [cmd, ...args] = process.argv.slice(2);
const call = async (method, body) => {
  const url = `${BASE}/api/seo/fixes${method === "GET" ? `?limit=${Number(args[0]) || 20}` : ""}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status}: ${data.error ?? "request failed"}`);
  return data;
};

try {
  if (cmd === "list") console.log(JSON.stringify((await call("GET")).fixes, null, 2));
  else if (cmd === "done" && args[0] && args[1]) console.log(JSON.stringify(await call("POST", { id: args[0], status: "done", commit: args[1], note: args[2] }), null, 2));
  else if (cmd === "failed" && args[0]) console.log(JSON.stringify(await call("POST", { id: args[0], status: "failed", note: args[1] ?? "" }), null, 2));
  else {
    console.error("usage: queue.mjs list [limit] | done <id> <commit> [note] | failed <id> <why>");
    process.exit(1);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
