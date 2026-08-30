import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceCitation } from "@/components/SourceCitation";
import { sampleSource } from "@/test/fixtures";

describe("SourceCitation", () => {
  it("returns null when sources are empty", () => {
    const { container } = render(<SourceCitation sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders collapsible source list", () => {
    render(<SourceCitation sources={[sampleSource]} />);
    expect(screen.getByText("Sources (1)")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: sampleSource.title })
    ).toHaveAttribute("href", sampleSource.url);
    expect(screen.getByText("AI / ML")).toBeInTheDocument();
  });
});
