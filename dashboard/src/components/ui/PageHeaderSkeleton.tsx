export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-3 w-20 animate-pulse rounded bg-surface-raised" />
      <div className="h-8 w-56 max-w-full animate-pulse rounded bg-surface-raised" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-surface-raised" />
    </div>
  );
}
