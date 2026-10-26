import { after } from "next/server";
import { prepareChat } from "@/lib/assistant/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

async function handle(req: Request) {
  const body = req.method === "POST" ? await req.json().catch(() => null) : null;
  const result = await prepareChat({
    method: req.method,
    origin: req.headers.get("origin"),
    ip: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim(),
    userAgent: req.headers.get("user-agent") || "",
    body,
  });

  if (!("stream" in result)) {
    return result.json
      ? Response.json(result.json, { status: result.status, headers: NO_STORE })
      : new Response(null, { status: result.status, headers: NO_STORE });
  }

  // Wait for the first chunk (or an error) so a failure can still return a proper status code.
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let resolveFirst!: (outcome: { ok: true } | { ok: false; status: number; message: string }) => void;
  const first = new Promise<Parameters<typeof resolveFirst>[0]>((r) => (resolveFirst = r));
  const stream = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) });

  const done = result
    .stream(
      (text) => {
        resolveFirst({ ok: true });
        controller.enqueue(encoder.encode(text));
      },
      (status, message) => resolveFirst({ ok: false, status, message }),
    )
    .finally(() => {
      resolveFirst({ ok: true });
      try {
        controller.close();
      } catch {
        // already closed
      }
    });
  after(() => done.then(result.log));

  const outcome = await first;
  if (!outcome.ok) return Response.json({ error: outcome.message }, { status: outcome.status, headers: NO_STORE });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Accel-Buffering": "no", ...NO_STORE },
  });
}

export { handle as GET, handle as POST };
