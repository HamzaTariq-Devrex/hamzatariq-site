import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwner();
  if (!owner) redirect("/admin/login");
  return (
    <div className="adm-shell">
      {/* The nav reads ?tab= (the Map item), so it sits in its own Suspense boundary. */}
      <Suspense fallback={<aside className="adm-nav" />}>
        <AdminNav email={owner.user.email ?? ""} />
      </Suspense>
      <div className="adm-content">{children}</div>
    </div>
  );
}
