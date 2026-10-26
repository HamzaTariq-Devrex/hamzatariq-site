import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getOwner()) redirect("/admin/leads");
  return (
    <main className="admin-login">
      <h1>Admin sign in</h1>
      <LoginForm />
    </main>
  );
}
