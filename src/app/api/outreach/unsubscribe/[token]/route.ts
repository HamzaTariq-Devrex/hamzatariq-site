import { ox } from "@/lib/outreach/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = /^[a-f0-9]{36}$/;

/**
 * One-click unsubscribe (RFC 8058): mail apps POST "List-Unsubscribe=One-Click" here.
 * GET never unsubscribes (link scanners open links); it redirects to the confirmation page.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return new Response("Not found", { status: 404 });
  try {
    await ox.unsubscribe(token, true);
  } catch (e) {
    console.error("unsubscribe:", (e as Error).message);
    return new Response("Error", { status: 500 });
  }
  return new Response("Unsubscribed", { status: 200, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return Response.redirect(new URL(`/unsubscribe/${TOKEN.test(token) ? token : ""}`, req.url), 303);
}
