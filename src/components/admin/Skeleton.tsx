// Placeholder blocks for admin loading states (loading.tsx and Suspense fallbacks). Server-safe.

export const SkeletonBlock = ({ h = 16, w = "100%" }: { h?: number; w?: number | string }) => <span className="adm-skel" style={{ height: h, width: w }} aria-hidden="true" />;

export const SkeletonStats = ({ n = 5 }: { n?: number }) => (
  <section className="adm-stats" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="adm-stat">
        <SkeletonBlock h={12} w="55%" />
        <SkeletonBlock h={30} w="40%" />
        <SkeletonBlock h={12} w="80%" />
      </div>
    ))}
  </section>
);

export const SkeletonCard = ({ rows = 5, title = true }: { rows?: number; title?: boolean }) => (
  <section className="adm-card" aria-hidden="true">
    {title && (
      <div className="adm-card-head">
        <SkeletonBlock h={18} w={180} />
      </div>
    )}
    <div className="adm-skel-rows">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonBlock key={i} h={18} w={`${92 - ((i * 13) % 30)}%`} />
      ))}
    </div>
  </section>
);

export const SkeletonPage = ({ title, stats = 0, cards = 2 }: { title: string; stats?: number; cards?: number }) => (
  <main className="adm-page" aria-busy="true">
    <header className="adm-head">
      <div>
        <h1>{title}</h1>
        <SkeletonBlock h={14} w={320} />
      </div>
    </header>
    {stats > 0 && <SkeletonStats n={stats} />}
    {Array.from({ length: cards }, (_, i) => (
      <SkeletonCard key={i} rows={i === 0 ? 6 : 4} />
    ))}
    <span className="sr-only" role="status">
      Loading {title}…
    </span>
  </main>
);
