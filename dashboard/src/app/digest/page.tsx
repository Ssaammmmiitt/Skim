import { DigestFeed } from "@/components/digest/DigestFeed";
import { PageContainer } from "@/components/layout/PageContainer";
import { fetchLatestDigest, todayUtc } from "@/lib/digests";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Today's Digest | Skim" };

export default async function DigestPage() {
  const supabase = await createClient();
  const digest = await fetchLatestDigest(supabase);
  const isToday = digest.date === todayUtc();

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-3xl font-normal leading-tight text-on-canvas sm:text-4xl lg:text-[40px]">
          {isToday ? "Today's Briefing" : "Latest Briefing"}
        </h1>
        <p className="mt-2 text-base font-normal text-muted sm:text-lg">
          {isToday
            ? `Curated tech news for ${new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}`
            : `Showing latest briefing from ${digest.date}`}
        </p>
      </div>
      <DigestFeed digest={digest} isToday={isToday} />
    </PageContainer>
  );
}
