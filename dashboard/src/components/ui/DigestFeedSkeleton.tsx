import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type DigestFeedSkeletonProps = {
  cards?: number;
  className?: string;
};

export function DigestFeedSkeleton({
  cards = 4,
  className,
}: DigestFeedSkeletonProps) {
  return (
    <div
      className={cn("space-y-5", className)}
      aria-hidden
      aria-label="Loading digest…"
    >
      {/* Header skeleton */}
      <div className="mb-8 space-y-3">
        <div className="shimmer h-3 w-24 rounded" />
        <div className="shimmer h-8 w-64 max-w-full rounded" />
      </div>

      {/* Card skeletons in timeline layout */}
      <div className="relative flex flex-col gap-5">
        {/* Rail line — visible on md+ */}
        <div
          className="absolute inset-y-0 left-[7.5rem] hidden w-px border-l border-dashed border-surface-raised md:block"
          aria-hidden="true"
        />

        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="flex items-start gap-4">
            {/* Timestamp stub (md+) */}
            <div className="hidden w-28 shrink-0 pt-5 md:block">
              <div className="shimmer ml-auto h-3 w-16 rounded" />
            </div>

            {/* Rail dot (md+) */}
            <div className="hidden shrink-0 pt-5 md:flex">
              <div className="shimmer h-2 w-2 rounded-full" />
            </div>

            {/* Card body */}
            <div className={cn(ui.card, "min-w-0 flex-1 space-y-3 p-5")}>
              <div className="flex gap-2">
                <div className="shimmer h-5 w-14 rounded-full" />
                <div className="shimmer h-5 w-20 rounded-full" />
              </div>
              <div className="shimmer h-5 w-full rounded" />
              <div className="shimmer h-4 w-5/6 rounded" />
              <div className="shimmer h-3 w-full rounded" />
              <div className="shimmer h-3 w-4/6 rounded" />
              <div className="mt-4 flex justify-between border-t border-surface-raised pt-4">
                <div className="shimmer h-3 w-20 rounded" />
                <div className="shimmer h-3 w-12 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
