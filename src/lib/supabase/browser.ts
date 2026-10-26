import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** Browser client for the /admin login (stores the PKCE verifier in a cookie for the callback route). */
export const browserClient = () =>
  createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
