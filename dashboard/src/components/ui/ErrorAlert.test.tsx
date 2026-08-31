import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

describe("ErrorAlert", () => {
  it("renders message", () => {
    render(<ErrorAlert message="Something failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something failed");
  });

  it("calls onRetry when retry is clicked", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorAlert message="Network error" onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
