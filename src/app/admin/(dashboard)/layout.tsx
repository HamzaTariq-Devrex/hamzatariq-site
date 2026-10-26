import { redirect } from "next/navigation";
import { getOwner } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwner();
  if (!owner) redirect("/admin/login");
  return (
    <div className="adm-shell">
      <AdminNav email={owner.user.email ?? ""} />
      <div className="adm-content">{children}</div>
    </div>
  );
}
