import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopicBadge } from "@/components/digest/TopicBadge";

describe("TopicBadge", () => {
  it("renders known topic label", () => {
    render(<TopicBadge topic="ai_ml" />);
    expect(screen.getByText("AI / ML")).toBeInTheDocument();
  });

  it("renders Other for null topic", () => {
    render(<TopicBadge topic={null} />);
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("applies topic Tailwind classes", () => {
    render(<TopicBadge topic="ai_ml" />);
    const badge = screen.getByText("AI / ML");
    expect(badge.className).toContain("bg-topic-ai");
    expect(badge.className).toContain("text-topic-ai-text");
  });
});
