import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopicBadge } from "@/components/TopicBadge";

describe("TopicBadge", () => {
  it("renders known topic label", () => {
    render(<TopicBadge topic="ai_ml" />);
    expect(screen.getByText("AI / ML")).toBeInTheDocument();
  });

  it("renders Other for null topic", () => {
    render(<TopicBadge topic={null} />);
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("applies topic colors as inline styles", () => {
    render(<TopicBadge topic="ai_ml" />);
    const badge = screen.getByText("AI / ML");
    expect(badge).toHaveStyle({ backgroundColor: "#164e63" });
  });
});
