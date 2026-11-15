import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { withSessionAge } from "@/lib/supabase/session";

// Refreshes the Supabase session cookie for /admin only; every other route stays static.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, withSessionAge(options)));
      },
    },
  });
  // Refreshes an expired session; the JWT itself is verified locally (ES256), no auth round trip.
  await supabase.auth.getClaims();
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
