import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getOwner()) redirect("/admin/leads");
  const { error } = await searchParams;
  return (
    <main className="admin-login">
      <h1>Admin sign in</h1>
      <p>Enter the owner email. You&apos;ll get a sign-in link; open it in this browser.</p>
      {error && (
        <p className="admin-error" role="alert">
          That sign-in link didn&apos;t work or has expired. Request a new one.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
