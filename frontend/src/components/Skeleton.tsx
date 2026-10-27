/** Loading placeholders shaped like the content they stand in for. */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-2 ${className}`} aria-hidden="true" />;
}

/** The company header: title, chips, and the four-figure stat strip. */
export function HeaderSkeleton() {
  return (
    <section className="panel overflow-hidden" aria-busy="true" aria-label="Loading analysis">
      <div className="space-y-3 px-5 py-4">
        <Skeleton className="h-6 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-border/50 border-t border-border/70 sm:grid-cols-4">
        {[0, 1, 2, 3].map((cell) => (
          <div key={cell} className="space-y-2 px-5 py-3">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </dl>
    </section>
  );
}

/** One analysis stage: numbered heading, blurb, and a panel of rows. */
export function StageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="space-y-3" aria-hidden="true">
      <div className="flex gap-3">
        <Skeleton className="h-6 w-6 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-full max-w-xl" />
        </div>
      </div>
      <div className="panel space-y-3 p-4">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="space-y-2">
            <Skeleton className="h-3 w-52" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <StageSkeleton rows={4} />
      <StageSkeleton rows={2} />
    </div>
  );
}
