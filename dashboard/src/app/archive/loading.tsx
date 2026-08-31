import { PageContainer } from "@/components/layout/PageContainer";
import { DigestFeedSkeleton } from "@/components/ui/DigestFeedSkeleton";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function ArchiveLoading() {
  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeaderSkeleton />
        <div className="h-11 w-full max-w-xs animate-pulse rounded-full bg-surface-raised" />
        <DigestFeedSkeleton cards={4} />
      </div>
    </PageContainer>
  );
}
