import { cn } from "@/lib/cn";

type DigestFeedSkeletonProps = {
  cards?: number;
  className?: string;
};

export function DigestFeedSkeleton({
  cards = 4,
  className,
}: DigestFeedSkeletonProps) {
  return (
    <div className={cn("animate-pulse", className)} aria-hidden>
      <div className="mb-8 space-y-3">
        <div className="h-3 w-24 rounded bg-surface-raised" />
        <div className="h-8 w-64 max-w-full rounded bg-surface-raised" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: cards }, (_, index) => (
          <div
            key={index}
            className="skim-card space-y-3 p-5"
          >
            <div className="flex gap-3">
              <div className="h-6 w-6 shrink-0 rounded-full bg-surface-raised" />
              <div className="h-5 flex-1 rounded bg-surface-raised" />
            </div>
            <div className="h-3 w-full rounded bg-surface-raised" />
            <div className="h-3 w-5/6 rounded bg-surface-raised" />
            <div className="h-3 w-2/3 rounded bg-surface-raised" />
          </div>
        ))}
      </div>
    </div>
  );
}
