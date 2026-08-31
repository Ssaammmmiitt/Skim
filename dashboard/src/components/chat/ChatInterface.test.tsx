import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { resetChatStore } from "@/store/chat-store";

describe("ChatInterface", () => {
  beforeEach(() => {
    resetChatStore();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/chat") && init?.method !== "POST") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ remaining: 19, used: 1, limit: 20 }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            answer: "OpenAI announced a new model.",
            sources: [
              {
                id: 1,
                title: "OpenAI update",
                url: "https://example.com",
                source: "techcrunch",
                published_at: "2026-08-30T00:00:00Z",
                topic: "ai_ml",
              },
            ],
            remaining: 18,
            used: 2,
          }),
        });
      })
    );
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows suggested prompts in empty state", async () => {
    render(<ChatInterface />);
    expect(
      await screen.findByText("What happened in AI this week?")
    ).toBeInTheDocument();
    expect(await screen.findByText(/19 questions left today/)).toBeInTheDocument();
  });

  it("sends a message and renders assistant reply with sources", async () => {
    const user = userEvent.setup();
    render(<ChatInterface />);

    await user.type(
      screen.getByPlaceholderText("Ask about recent tech news…"),
      "What happened in AI?"
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("What happened in AI?")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText("OpenAI announced a new model.")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Sources (1)")).toBeInTheDocument();
    expect(screen.getByText(/18 questions left today/)).toBeInTheDocument();
  });

  it("uses suggested prompt buttons", async () => {
    const user = userEvent.setup();
    render(<ChatInterface />);

    await user.click(
      await screen.findByRole("button", {
        name: "Any major startup funding news?",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText("OpenAI announced a new model.")
      ).toBeInTheDocument();
    });
  });

  it("shows structured API errors with retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({
            error: "All AI providers are temporarily unavailable.",
            error_code: "all_providers_failed",
            tried_providers: ["gemini:gemini-3.6-flash", "groq:openai/gpt-oss-120b"],
            retry_after_seconds: 10,
          }),
        })
      )
    );

    const user = userEvent.setup();
    render(<ChatInterface />);

    await user.type(screen.getByPlaceholderText("Ask about recent tech news…"), "Hi");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("All AI providers are temporarily unavailable.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText(/Providers tried/)).toBeInTheDocument();
  });
});
