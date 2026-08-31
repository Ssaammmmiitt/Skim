import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function AdminLoading() {
  return (
    <PageContainer>
      <PageHeaderSkeleton />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-card border border-surface-raised bg-surface"
          />
        ))}
      </div>
    </PageContainer>
  );
}
