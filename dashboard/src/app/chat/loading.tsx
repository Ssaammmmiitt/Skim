import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function ChatLoading() {
  return (
    <PageContainer size="lg" fill className="max-w-4xl">
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeaderSkeleton />
        <div className="mt-4 flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-card border border-surface-raised bg-surface">
          <div className="flex-1 space-y-4 p-5">
            <div className="mx-auto h-4 w-48 animate-pulse rounded bg-surface-raised" />
            <div className="mx-auto h-3 w-64 animate-pulse rounded bg-surface-raised" />
          </div>
          <div className="border-t border-surface-raised p-4">
            <div className="h-20 animate-pulse rounded-xl bg-surface-raised" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
