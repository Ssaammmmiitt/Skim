import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search/route";

const requireActiveUser = vi.fn();
const searchArticles = vi.fn();

vi.mock("@/lib/auth/require-active-user", () => ({
  requireActiveUser: () => requireActiveUser(),
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
    expect(searchArticles).not.toHaveBeenCalled();
  });

  it("returns search results", async () => {
    searchArticles.mockResolvedValue([
      { id: 1, title: "OpenAI", url: "https://example.com" },
    ]);

    const response = await GET(
      new NextRequest("http://localhost/api/search?q=OpenAI")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(searchArticles).toHaveBeenCalledWith({}, "OpenAI");
  });
});
