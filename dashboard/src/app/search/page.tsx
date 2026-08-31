import { Suspense } from "react";
import { SearchResults } from "@/components/search/SearchResults";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SearchPage() {
  return (
    <PageContainer size="lg">
      <Suspense fallback={<LoadingSpinner label="Loading search…" />}>
        <SearchResults />
      </Suspense>
    </PageContainer>
  );
}
