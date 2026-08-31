import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders primary and secondary variants", () => {
    render(
      <>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
      </>
    );

    expect(screen.getByRole("button", { name: "Primary" })).toHaveClass(
      "bg-primary"
    );
    expect(screen.getByRole("button", { name: "Secondary" })).toHaveClass(
      "border-ink"
    );
  });
});
