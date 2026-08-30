import { describe, expect, it } from "vitest";
import { searchArticles } from "@/lib/search";
import { createMockSupabase, createQueryBuilder } from "@/test/mock-supabase";

describe("searchArticles", () => {
  it("returns empty array for blank query", async () => {
    const supabase = createMockSupabase({});
    await expect(searchArticles(supabase, "   ")).resolves.toEqual([]);
  });

  it("uses full-text search when available", async () => {
    const builder = createQueryBuilder({
      data: [
        {
          id: 1,
          title: "OpenAI update",
          url: "https://example.com",
          source: "techcrunch",
          published_at: "2026-08-30T00:00:00Z",
          topic: "ai_ml",
          importance_score: 8,
        },
      ],
      error: null,
    });

    const supabase = createMockSupabase({
      articles: () => builder,
    });

    const results = await searchArticles(supabase, "OpenAI");
    expect(results).toHaveLength(1);
    expect(builder.textSearch).toHaveBeenCalledWith(
      "search_vector",
      "OpenAI",
      { type: "websearch", config: "english" }
    );
  });

  it("falls back to ilike when full-text search fails", async () => {
    const failing = createQueryBuilder({ data: null, error: { message: "fts" } });
    failing.textSearch = failing.textSearch;
    const fallback = createQueryBuilder({
      data: [
        {
          id: 2,
          title: "OpenAI fallback",
          url: "https://example.com/2",
          source: "hackernews",
          published_at: null,
          topic: null,
          importance_score: null,
        },
      ],
      error: null,
    });

    let call = 0;
    const supabase = createMockSupabase({
      articles: () => {
        call += 1;
        return call === 1 ? failing : fallback;
      },
    });

    const results = await searchArticles(supabase, "OpenAI");
    expect(results[0].title).toBe("OpenAI fallback");
    expect(fallback.or).toHaveBeenCalled();
  });
});
