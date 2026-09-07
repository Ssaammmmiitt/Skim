import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "@/components/layout/PageHeader";

describe("PageHeader", () => {
  it("renders eyebrow and title", () => {
    render(<PageHeader eyebrow="Archive" title="Past digests" />);
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Past digests", level: 1 })).toBeInTheDocument();
  });

  it("renders optional description", () => {
    render(
      <PageHeader
        eyebrow="Search"
        title="Find articles"
        description="Search across all digests."
      />
    );
    expect(screen.getByText("Search across all digests.")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    render(<PageHeader eyebrow="A" title="B" />);
    // Only two text nodes — no description paragraph
    expect(screen.queryByText(/digest/)).not.toBeInTheDocument();
  });

  it("renders optional action", () => {
    render(
      <PageHeader
        eyebrow="A"
        title="B"
        action={<button type="button">Export</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("renders optional badge", () => {
    render(
      <PageHeader
        eyebrow="Today"
        title="Digest"
        badge={<span data-testid="live-badge">Live</span>}
      />
    );
    expect(screen.getByTestId("live-badge")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("applies animate-slide-up class for scroll reveal", () => {
    const { container } = render(<PageHeader eyebrow="A" title="B" />);
    expect(container.firstChild).toHaveClass("animate-slide-up");
  });
});
