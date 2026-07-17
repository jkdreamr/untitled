/** Layout-stable skeletons (reserve space → no CLS) with a calm shimmer. */

export function CardSkeleton() {
  return (
    <div className="border-b border-bone-10 py-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="shimmer size-8 rounded-full" />
        <div className="space-y-1.5">
          <div className="shimmer h-3 w-28 rounded" />
          <div className="shimmer h-2.5 w-20 rounded" />
        </div>
      </div>
      <div className="shimmer h-40 w-full rounded-lg" />
      <div className="mt-5 space-y-2">
        <div className="shimmer h-5 w-1/2 rounded" />
        <div className="shimmer h-2.5 w-24 rounded" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6">
      <div className="py-6">
        <div className="shimmer h-7 w-40 rounded" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mx-auto max-w-2xl space-y-1 px-4 py-8 sm:px-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-3 py-3">
          <div className="shimmer size-16 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-3.5 w-2/3 rounded" />
            <div className="shimmer h-2.5 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
