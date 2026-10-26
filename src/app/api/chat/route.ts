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

  // The reply never fails (offline answers back up Gemini), so the stream can start right away.
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) });
  const done = result
    .stream((text) => controller.enqueue(encoder.encode(text)))
    .catch((error) => console.error("chat stream failed:", error))
    .finally(() => controller.close());
  after(() => done.then(result.log));

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Accel-Buffering": "no", ...NO_STORE },
  });
}

export { handle as GET, handle as POST };
