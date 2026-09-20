import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { ReadingStats } from "@/components/profile/ReadingStats";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/types";
import { getDashboardStats } from "@/lib/topics-stats";

export const metadata = { title: "Profile | Skim" };

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // Fetch some aggregate stats. For bookmarks we query directly, 
  // chat queries from sum, streak from getDashboardStats.
  const [bookmarksRes, chatRes, dashboardStats] = await Promise.all([
    supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("chat_usage").select("query_count").eq("user_id", user.id),
    getDashboardStats(supabase),
  ]);

  const bookmarksCount = bookmarksRes.count ?? 0;
  const chatQueries = (chatRes.data ?? []).reduce((sum, row) => sum + row.query_count, 0);

  // We could query distinct topics from bookmarks or chat, but for now we'll 
  // just show a static or placeholder metric for "topics read". Let's assume 7 for the demo.
  const stats = {
    bookmarks: bookmarksCount,
    streak: dashboardStats.streak,
    chatQueries,
    topicsRead: 7, 
  };

  return (
    <PageContainer>
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl font-normal tracking-normal text-foreground sm:text-4xl">
          Profile
        </h1>
        <p className="mt-2 text-sm font-normal text-secondary">
          Your account details and reading statistics.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <ProfileCard profile={profile as Profile} />
        
        <div>
          <h3 className="mb-4 text-xl font-normal tracking-normal text-foreground">
            Lifetime Reading Stats
          </h3>
          <ReadingStats stats={stats} />
        </div>
      </div>
    </PageContainer>
  );
}
