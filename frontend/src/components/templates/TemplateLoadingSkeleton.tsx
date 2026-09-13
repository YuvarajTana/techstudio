interface TemplateLoadingSkeletonProps {
  count?: number;
}

export function TemplateLoadingSkeleton({ count = 12 }: TemplateLoadingSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="aspect-[4/5] animate-pulse rounded-2xl bg-zinc-900" />
          <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-zinc-900" />
          <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-zinc-900" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-9 animate-pulse rounded-xl bg-zinc-900" />
            <div className="h-9 animate-pulse rounded-xl bg-zinc-900" />
          </div>
        </div>
      ))}
    </div>
  );
}
