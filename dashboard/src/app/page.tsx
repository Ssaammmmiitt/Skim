import { DigestFeed } from "@/components/DigestFeed";
import { fetchDigest, todayUtc } from "@/lib/digests";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const today = todayUtc();
  const digest = await fetchDigest(supabase, today);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <DigestFeed digest={digest} isToday />
    </div>
  );
}
