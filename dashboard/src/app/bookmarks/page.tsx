import { PageContainer } from "@/components/layout/PageContainer";
import { DigestFeed } from "@/components/digest/DigestFeed";
import { getUserBookmarks } from "@/lib/bookmarks";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";

export const metadata = { title: "Saved Stories | Skim" };

export default async function BookmarksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const articles = await getUserBookmarks(supabase, user.id);

  if (articles.length === 0) {
    return (
      <PageContainer fill>
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl font-normal tracking-normal text-foreground sm:text-4xl">
            Saved Stories
          </h1>
          <p className="mt-2 text-sm font-normal text-secondary">
            Articles you&apos;ve bookmarked to read later.
          </p>
        </div>
        
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-secondary mb-4">
             <Bookmark size={28} />
          </div>
          <h2 className="text-lg font-normal text-foreground">No saved stories</h2>
          <p className="mt-2 max-w-sm text-sm font-normal text-secondary">
            When you find a story you want to read later, click the bookmark icon on any article card.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Reuse DigestFeed
  const dummyDigest = {
    date: new Date().toISOString().split("T")[0],
    articles,
    sent_at: null,
    story_count: articles.length,
    subject: null,
  };

  return (
    <PageContainer>
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl font-normal tracking-normal text-foreground sm:text-4xl">
          Saved Stories
        </h1>
        <p className="mt-2 text-sm font-normal text-secondary">
          {articles.length} {articles.length === 1 ? "article" : "articles"} bookmarked to read later.
        </p>
      </div>

      <DigestFeed digest={dummyDigest} />
    </PageContainer>
  );
}
