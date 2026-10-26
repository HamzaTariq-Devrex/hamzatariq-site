"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/admin/(dashboard)/actions";

const LINKS = [
  {
    href: "/admin",
    label: "Overview",
    icon: <path d="M4 13h6V4H4zm10 7h6V11h-6zM4 20h6v-4H4zm10-11h6V4h-6z" />,
  },
  {
    href: "/admin/leads",
    label: "Leads",
    icon: <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75" />,
  },
  {
    href: "/admin/chats",
    label: "Chats",
    icon: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  },
];

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const AdminNav = ({ email }: { email: string }) => {
  const pathname = usePathname();
  return (
    <aside className="adm-nav">
      <a href="/" className="adm-brand">
        <span className="adm-brand-mark" aria-hidden="true">
          &lt;/&gt;
        </span>
        <span>
          Hamza.dev <small>Admin</small>
        </span>
      </a>
      <nav aria-label="Admin">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
              <Icon>{l.icon}</Icon>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className="adm-logout">
        <span title={email}>{email}</span>
        <button type="submit">
          <Icon>
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
          </Icon>
          Log out
        </button>
      </form>
    </aside>
  );
};

export default AdminNav;
