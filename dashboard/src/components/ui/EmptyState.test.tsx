import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders eyebrow, title, and description", () => {
    render(
      <EmptyState
        eyebrow="No data"
        title="Nothing here yet"
        description="Come back later."
      />
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.getByText("Come back later.")).toBeInTheDocument();
  });

  it("renders optional action", () => {
    render(
      <EmptyState
        eyebrow="Empty"
        title="No items"
        description="Try again."
        action={<button type="button">Retry</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders optional icon", () => {
    const Icon = () => <svg data-testid="icon" />;
    render(
      <EmptyState
        eyebrow="Empty"
        title="No items"
        description="."
        icon={<Icon />}
      />
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("does not render icon wrapper when icon is not provided", () => {
    const { container } = render(
      <EmptyState eyebrow="Empty" title="No items" description="." />
    );
    // No icon container div
    expect(container.querySelector("[class*='rounded-full']")).not.toBeInTheDocument();
  });

  it("applies animate-border-pulse class for the animated border", () => {
    const { container } = render(
      <EmptyState eyebrow="E" title="T" description="D" />
    );
    expect(
      container.firstChild
    ).toHaveClass("animate-border-pulse");
  });
});
