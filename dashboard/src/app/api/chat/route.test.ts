import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/chat/route";

const requireActiveUser = vi.fn();
const hybridRetrieve = vi.fn();
const generateChatAnswer = vi.fn();
const checkChatRateLimit = vi.fn();
const incrementChatUsage = vi.fn();
const getChatUsage = vi.fn();

vi.mock("@/lib/auth/require-active-user", () => ({
  requireActiveUser: () => requireActiveUser(),
}));

vi.mock("@/lib/retrieval", () => ({
  hybridRetrieve: (...args: unknown[]) => hybridRetrieve(...args),
}));

vi.mock("@/lib/chat/llm-client", () => ({
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
    hybridRetrieve.mockResolvedValue([
      {
        id: 1,
        title: "OpenAI update",
        url: "https://example.com",
        source: "techcrunch",
        published_at: "2026-08-30T00:00:00Z",
        summary: "Summary",
        insight: "Insight",
        topic: "ai_ml",
        similarity: 0.82,
        fts_rank: null,
        rrf_score: 0.015,
        retrieval_method: "hybrid",
      },
    ]);
    generateChatAnswer.mockResolvedValue({
      answer: "Here is what happened.",
      provider: "gemini",
      model: "gemini-3.6-flash",
    });
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
    expect(body.retrieval_method).toBe("hybrid");
    expect(hybridRetrieve).toHaveBeenCalledWith(
      {},
      "What happened in AI?",
      expect.objectContaining({ limit: 8, history: [] })
    );
    expect(incrementChatUsage).toHaveBeenCalledWith("user-1");
  });

  it("POST passes conversation history to retrieval", async () => {
    const history = [
      { role: "user" as const, content: "Tell me about OpenAI" },
      { role: "assistant" as const, content: "OpenAI released a new model." },
    ];

    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: "What about funding?", history }),
      })
    );

    expect(hybridRetrieve).toHaveBeenCalledWith(
      {},
      "What about funding?",
      expect.objectContaining({ history })
    );
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
