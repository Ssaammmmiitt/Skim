import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function SettingsLoading() {
  return (
    <PageContainer size="lg">
      <PageHeaderSkeleton />
      <div className="mt-8 space-y-10">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-4">
            <div className="h-3 w-32 animate-pulse rounded bg-surface-raised" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-surface-raised" />
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, card) => (
                <div
                  key={card}
                  className="h-36 animate-pulse rounded-card border border-surface-raised bg-surface"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
