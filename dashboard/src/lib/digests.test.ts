import { describe, expect, it } from "vitest";
import { fetchDigest, fetchDigestDates, todayUtc } from "@/lib/digests";
import { sampleArticle, sampleArticle2 } from "@/test/fixtures";
import { createMockSupabase, createQueryBuilder } from "@/test/mock-supabase";

describe("digests lib", () => {
  it("todayUtc returns YYYY-MM-DD", () => {
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("fetchDigestDates returns ordered date strings", async () => {
    const supabase = createMockSupabase({
      digests: () =>
        createQueryBuilder({
          data: [{ digest_date: "2026-08-30" }, { digest_date: "2026-08-29" }],
          error: null,
        }),
    });

    await expect(fetchDigestDates(supabase)).resolves.toEqual([
      "2026-08-30",
      "2026-08-29",
    ]);
  });

  it("fetchDigest returns empty digest when none exists", async () => {
    const supabase = createMockSupabase({
      digests: () => createQueryBuilder({ data: null, error: null }),
    });

    const result = await fetchDigest(supabase, "2099-01-01");
    expect(result.articles).toEqual([]);
    expect(result.date).toBe("2099-01-01");
  });

  it("fetchDigest preserves agent article ordering", async () => {
    const supabase = createMockSupabase({
      digests: () =>
        createQueryBuilder({
          data: {
            digest_date: "2026-08-30",
            sent_at: "2026-08-30T00:00:00Z",
            article_ids: [2, 1],
            story_count: 2,
            subject: "Skim",
          },
          error: null,
        }),
      articles: () =>
        createQueryBuilder({
          data: [sampleArticle, sampleArticle2],
          error: null,
        }),
    });

    const result = await fetchDigest(supabase, "2026-08-30");
    expect(result.articles.map((article) => article.id)).toEqual([2, 1]);
    expect(result.story_count).toBe(2);
  });

  it("fetchDigest throws on database error", async () => {
    const supabase = createMockSupabase({
      digests: () =>
        createQueryBuilder({ data: null, error: { message: "db down" } }),
    });

    await expect(fetchDigest(supabase, "2026-08-30")).rejects.toThrow(
      "db down"
    );
  });
});
