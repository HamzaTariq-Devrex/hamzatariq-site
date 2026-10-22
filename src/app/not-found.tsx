import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <SiteShell>
      <section className="page-hero page-404">
        <span className="page-eyebrow">404</span>
        <h1>
          Page not <span>found</span>
        </h1>
        <p>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="project-actions">
          <a href="/" className="page-btn page-btn-primary">
            Back to home
          </a>
          <Link href="/work" className="page-btn page-btn-ghost">
            See my work
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
