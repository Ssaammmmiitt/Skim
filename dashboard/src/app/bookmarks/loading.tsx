import { PageContainer } from "@/components/layout/PageContainer";

export default function BookmarksLoading() {
  return (
    <PageContainer>
      <div className="mb-6 sm:mb-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-raised" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-surface-raised" />
      </div>

      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[280px] w-full animate-pulse rounded-3xl border border-surface-raised bg-surface shadow-sm"
          />
        ))}
      </div>
    </PageContainer>
  );
}
