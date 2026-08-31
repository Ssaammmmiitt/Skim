import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetChatStore, useChatStore } from "@/store/chat-store";

describe("chat-store", () => {
  beforeEach(() => {
    resetChatStore();
    vi.restoreAllMocks();
  });

  it("updates input", () => {
    useChatStore.getState().setInput("hello");
    expect(useChatStore.getState().input).toBe("hello");
  });

  it("sendMessage appends user and assistant messages on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            answer: "Test answer",
            sources: [],
            remaining: 10,
          }),
        })
      )
    );

    await useChatStore.getState().sendMessage("Hello");

    const { messages } = useChatStore.getState();
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("Hello");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].content).toBe("Test answer");
    expect(useChatStore.getState().remaining).toBe(10);
  });

  it("sendMessage records structured errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({
            error: "Quota exceeded",
            error_code: "quota_exhausted",
          }),
        })
      )
    );

    await useChatStore.getState().sendMessage("Hello");

    expect(useChatStore.getState().error?.error_code).toBe("quota_exhausted");
    expect(useChatStore.getState().messages).toHaveLength(1);
  });
});
