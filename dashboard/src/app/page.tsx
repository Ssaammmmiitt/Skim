import { DigestFeed } from "@/components/digest/DigestFeed";
import { PageContainer } from "@/components/layout/PageContainer";
import { fetchDigest, todayUtc } from "@/lib/digests";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const today = todayUtc();
  const digest = await fetchDigest(supabase, today);

  return (
    <PageContainer>
      <DigestFeed digest={digest} isToday />
    </PageContainer>
  );
}
