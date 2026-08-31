import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateChatAnswer } from "@/lib/chat/llm-client";

const { generateContent, groqCreate } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  groqCreate: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent,
    };
  },
}));

vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = {
      completions: {
        create: groqCreate,
      },
    };
  },
}));

describe("generateChatAnswer", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("GEMINI_API_KEYS", "gemini-a,gemini-b");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.6-flash");
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "");
    vi.stubEnv("GROQ_API_KEYS", "groq-a");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-120b");
    generateContent.mockReset();
    groqCreate.mockReset();
  });

  it("returns Gemini answer on first successful key", async () => {
    generateContent.mockResolvedValue({ text: "Answer from Gemini" });

    const result = await generateChatAnswer("What is new?", []);

    expect(result).toEqual({
      answer: "Answer from Gemini",
      provider: "gemini",
      model: "gemini-3.6-flash",
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("rotates Gemini keys on 429 then succeeds", async () => {
    generateContent
      .mockRejectedValueOnce(
        new Error(
          JSON.stringify({
            error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "quota" },
          })
        )
      )
      .mockResolvedValueOnce({ text: "Second key works" });

    const result = await generateChatAnswer("Hello", []);

    expect(result.provider).toBe("gemini");
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(result.answer).toBe("Second key works");
  });

  it("falls back to Groq when all Gemini attempts fail", async () => {
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "gemini-2.0-flash");
    generateContent.mockRejectedValue(
      new Error(
        JSON.stringify({
          error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "quota" },
        })
      )
    );
    groqCreate.mockResolvedValue({
      choices: [{ message: { content: "Answer from Groq" } }],
    });

    const result = await generateChatAnswer("Hello", []);

    expect(result).toEqual({
      answer: "Answer from Groq",
      provider: "groq",
      model: "openai/gpt-oss-120b",
    });
    expect(groqCreate).toHaveBeenCalledTimes(1);
  });
});
