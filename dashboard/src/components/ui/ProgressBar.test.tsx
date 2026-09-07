import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "@/components/ui/ProgressBar";

describe("ProgressBar", () => {
  it("renders with correct aria attributes", () => {
    render(<ProgressBar value={60} label="Upload progress" />);
    const bar = screen.getByRole("progressbar", { name: "Upload progress" });
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute("aria-valuenow", "60");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps value above 100 to 100", () => {
    render(<ProgressBar value={150} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
  });

  it("clamps value below 0 to 0", () => {
    render(<ProgressBar value={-20} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  it("shows label and percentage when showLabel is true", () => {
    render(<ProgressBar value={42} label="Completion" showLabel />);
    expect(screen.getByText("Completion")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("does not show label by default", () => {
    render(<ProgressBar value={50} label="Hidden" />);
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("applies correct fill width via inline style", () => {
    const { container } = render(<ProgressBar value={75} />);
    const fill = container.querySelector("[style*='width']");
    expect(fill).toBeTruthy();
    expect((fill as HTMLElement).style.width).toBe("75%");
  });
});
