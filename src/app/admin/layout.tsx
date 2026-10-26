import type { Metadata } from "next";
import "@/components/styles/Pages.css";
import "@/components/styles/Admin.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="page admin">{children}</div>;
}
