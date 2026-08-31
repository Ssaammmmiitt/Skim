import { DigestFeedSkeleton } from "@/components/ui/DigestFeedSkeleton";
import { PageContainer } from "@/components/layout/PageContainer";

export default function Loading() {
  return (
    <PageContainer>
      <DigestFeedSkeleton cards={5} />
    </PageContainer>
  );
}
