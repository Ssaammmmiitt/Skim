import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search/route";

const requireActiveUser = vi.fn();
const hybridRetrieve = vi.fn();
const searchArticles = vi.fn();

vi.mock("@/lib/auth/require-active-user", () => ({
  requireActiveUser: () => requireActiveUser(),
}));

vi.mock("@/lib/retrieval", () => ({
  hybridRetrieve: (...args: unknown[]) => hybridRetrieve(...args),
}));

vi.mock("@/lib/search", () => ({
  searchArticles: (...args: unknown[]) => searchArticles(...args),
}));

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireActiveUser.mockResolvedValue({
      ok: true,
      ctx: { supabase: {} },
    });
  });

  it("returns empty results for blank query", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/search?q=")
    );
    const body = await response.json();
    expect(body.results).toEqual([]);
    expect(hybridRetrieve).not.toHaveBeenCalled();
    expect(searchArticles).not.toHaveBeenCalled();
  });

  it("returns hybrid search results by default", async () => {
    hybridRetrieve.mockResolvedValue([
      {
        id: 1,
        title: "OpenAI",
        url: "https://example.com",
        source: "techcrunch",
        summary: null,
        insight: null,
        topic: "ai_ml",
        importance_score: 8,
        key_takeaway: null,
        published_at: null,
        similarity: 0.9,
        fts_rank: 0.12,
        rrf_score: 0.02,
        retrieval_method: "hybrid",
      },
    ]);

    const response = await GET(
      new NextRequest("http://localhost/api/search?q=OpenAI")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.mode).toBe("hybrid");
    expect(hybridRetrieve).toHaveBeenCalledWith({}, "OpenAI", { limit: 20 });
    expect(searchArticles).not.toHaveBeenCalled();
  });

  it("uses keyword mode when requested", async () => {
    searchArticles.mockResolvedValue([
      { id: 1, title: "OpenAI", url: "https://example.com" },
    ]);

    const response = await GET(
      new NextRequest("http://localhost/api/search?q=OpenAI&mode=keyword")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("keyword");
    expect(searchArticles).toHaveBeenCalledWith({}, "OpenAI", { limit: 20 });
    expect(hybridRetrieve).not.toHaveBeenCalled();
  });
});
