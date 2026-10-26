import { NextResponse } from "next/server";
import { authClient } from "@/lib/supabase/server";

// The magic link from Supabase Auth lands here with a one-time code (PKCE).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await authClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/admin/leads", url.origin));
  }
  return NextResponse.redirect(new URL("/admin/login?error=1", url.origin));
}
