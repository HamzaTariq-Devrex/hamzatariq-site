export const dynamic = "force-static";

export function GET() {
  return new Response(process.env.VERCEL_GIT_COMMIT_SHA ?? "local", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
