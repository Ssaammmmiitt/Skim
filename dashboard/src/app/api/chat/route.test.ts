import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/chat/route";

const requireActiveUser = vi.fn();
const searchArticles = vi.fn();
const generateChatAnswer = vi.fn();
const checkChatRateLimit = vi.fn();
const incrementChatUsage = vi.fn();
const getChatUsage = vi.fn();

vi.mock("@/lib/auth/require-active-user", () => ({
  requireActiveUser: () => requireActiveUser(),
}));

vi.mock("@/lib/search", () => ({
  searchArticles: (...args: unknown[]) => searchArticles(...args),
}));

vi.mock("@/lib/chat/gemini", () => ({
  generateChatAnswer: (...args: unknown[]) => generateChatAnswer(...args),
}));

vi.mock("@/lib/chat/rate-limit", () => ({
  CHAT_DAILY_LIMIT: 20,
  checkChatRateLimit: (...args: unknown[]) => checkChatRateLimit(...args),
  incrementChatUsage: (...args: unknown[]) => incrementChatUsage(...args),
  getChatUsage: (...args: unknown[]) => getChatUsage(...args),
}));

describe("/api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireActiveUser.mockResolvedValue({
      ok: true,
      ctx: { user: { id: "user-1" }, supabase: {} },
    });
    checkChatRateLimit.mockResolvedValue({
      allowed: true,
      used: 1,
      remaining: 19,
    });
    searchArticles.mockResolvedValue([
      {
        id: 1,
        title: "OpenAI update",
        url: "https://example.com",
        source: "techcrunch",
        published_at: "2026-08-30T00:00:00Z",
        summary: "Summary",
        insight: "Insight",
        topic: "ai_ml",
      },
    ]);
    generateChatAnswer.mockResolvedValue("Here is what happened.");
    incrementChatUsage.mockResolvedValue(undefined);
    getChatUsage.mockResolvedValue(1);
  });

  it("GET returns remaining quota", async () => {
    getChatUsage.mockResolvedValue(3);
    const response = await GET();
    const body = await response.json();
    expect(body).toEqual({ limit: 20, used: 3, remaining: 17 });
  });

  it("POST returns answer and sources", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: "What happened in AI?" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer).toBe("Here is what happened.");
    expect(body.sources).toHaveLength(1);
    expect(incrementChatUsage).toHaveBeenCalledWith("user-1");
  });

  it("POST returns 429 when rate limited", async () => {
    checkChatRateLimit.mockResolvedValue({
      allowed: false,
      used: 20,
      remaining: 0,
    });

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Hello" }),
      })
    );

    expect(response.status).toBe(429);
  });

  it("POST validates message body", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: "   " }),
      })
    );
    expect(response.status).toBe(400);
  });
});
