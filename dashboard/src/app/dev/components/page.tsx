import { PageContainer } from "@/components/layout/PageContainer";
import { DigestCard } from "@/components/digest/DigestCard";
import { TopicBadge } from "@/components/digest/TopicBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyButton } from "@/components/ui/CopyButton";
import { BookmarkButton } from "@/components/digest/BookmarkButton";

export const metadata = { title: "Dev Components | Skim" };

export default function DevComponentsPage() {
  const dummyArticle = {
    id: 1,
    title: "Understanding Server Actions in Next.js 14",
    url: "https://example.com/nextjs",
    source: "Vercel Blog",
    published_at: new Date().toISOString(),
    summary: "Server Actions are a new way to handle mutations in Next.js...",
    topic: "web",
    importance_score: 9.5,
    insight: "This simplifies the data mutation story significantly by removing the need for manual API routes.",
    key_takeaway: "Use Server Actions for forms.",
  };

  return (
    <PageContainer>
      <div className="mb-12">
        <h1 className="text-3xl font-normal text-foreground">Component Library</h1>
        <p className="mt-1 text-sm font-normal text-secondary">Live documentation and visual regression testing.</p>
      </div>

      <div className="space-y-16">
        <section>
          <h2 className="mb-4 border-b border-border pb-2 text-xl font-normal text-foreground">
            Digest Card
          </h2>
          <div className="max-w-md">
            <DigestCard article={dummyArticle} rank={1} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 border-b border-border pb-2 text-xl font-normal text-foreground">
            Topic Badges
          </h2>
          <div className="flex flex-wrap gap-4">
            {["ai", "web", "cloud", "security", "startups", "code", "science"].map((topic) => (
              <TopicBadge key={topic} topic={topic} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 border-b border-border pb-2 text-xl font-normal text-foreground">
            Empty States
          </h2>
          <div className="max-w-xl">
             <EmptyState
              eyebrow="No results"
              title="Nothing found"
              description="We couldn't find any articles matching your search query. Try different keywords."
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 border-b border-border pb-2 text-xl font-normal text-foreground">
            UI Primitives
          </h2>
          <div className="flex items-center gap-4">
            <CopyButton textToCopy="https://example.com" label="Copy Link" />
            <BookmarkButton articleId={999} />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
