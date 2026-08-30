import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatMessage } from "@/components/ChatMessage";
import { assistantMessage, userMessage } from "@/test/fixtures";

describe("ChatMessage", () => {
  it("renders user message content", () => {
    render(<ChatMessage message={userMessage} />);
    expect(screen.getByText(userMessage.content)).toBeInTheDocument();
    expect(screen.queryByText("Skim")).not.toBeInTheDocument();
  });

  it("renders assistant message with Skim label and sources", () => {
    render(<ChatMessage message={assistantMessage} />);
    expect(screen.getByText("Skim")).toBeInTheDocument();
    expect(screen.getByText(assistantMessage.content)).toBeInTheDocument();
    expect(screen.getByText("Sources (1)")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: assistantMessage.sources![0].title })
    ).toHaveAttribute("href", assistantMessage.sources![0].url);
  });
});
