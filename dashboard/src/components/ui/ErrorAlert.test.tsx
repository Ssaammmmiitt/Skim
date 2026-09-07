import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

describe("ErrorAlert", () => {
  it("renders message", () => {
    render(<ErrorAlert message="Failed to load digest" />);
    expect(screen.getByText("Failed to load digest")).toBeInTheDocument();
  });

  it("renders optional title above message", () => {
    render(<ErrorAlert message="Details here" title="Load error" />);
    expect(screen.getByText("Load error")).toBeInTheDocument();
    expect(screen.getByText("Details here")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const retry = vi.fn();
    render(<ErrorAlert message="Oops" onRetry={retry} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<ErrorAlert message="Oops" onRetry={retry} />);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders custom retry label", () => {
    render(<ErrorAlert message="Oops" onRetry={vi.fn()} retryLabel="Reload" />);
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
  });

  it("renders dismiss button when dismissible is true", () => {
    render(<ErrorAlert message="Oops" dismissible />);
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
  });

  it("dismisses when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<ErrorAlert message="Dismissible error" dismissible />);
    expect(screen.getByText("Dismissible error")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText("Dismissible error")).not.toBeInTheDocument();
  });

  it("has role=alert", () => {
    render(<ErrorAlert message="Error" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<ErrorAlert message="Error" />);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });
});
