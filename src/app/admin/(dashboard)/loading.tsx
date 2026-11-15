import { SkeletonPage } from "@/components/admin/Skeleton";

// Shown at once on navigation (and prefetched with the sidebar links) while the page loads.
export default function Loading() {
  return <SkeletonPage title="Overview" stats={5} cards={3} />;
}
