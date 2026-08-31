import { describe, expect, it } from "vitest";
import {
  isQuotaExhausted,
  isRetryableProviderStatus,
  parseProviderError,
} from "@/lib/chat/errors";

describe("parseProviderError", () => {
  it("parses embedded Gemini JSON quota errors", () => {
    const raw = JSON.stringify({
      error: {
        code: 429,
        message: "You exceeded your current quota",
        status: "RESOURCE_EXHAUSTED",
      },
    });

    const parsed = parseProviderError(new Error(raw));
    expect(parsed.status).toBe(429);
    expect(parsed.code).toBe("RESOURCE_EXHAUSTED");
    expect(isQuotaExhausted(parsed.status, parsed.code, parsed.message)).toBe(true);
  });

  it("extracts retry delay from message text", () => {
    const parsed = parseProviderError(
      new Error('Quota exceeded. Please retry in 9.497882805s.')
    );
    expect(parsed.retryAfterSeconds).toBe(10);
  });
});

describe("isRetryableProviderStatus", () => {
  it("treats 429 and 503 as retryable", () => {
    expect(isRetryableProviderStatus(429, "RESOURCE_EXHAUSTED")).toBe(true);
    expect(isRetryableProviderStatus(503)).toBe(true);
    expect(isRetryableProviderStatus(400)).toBe(false);
  });
});
