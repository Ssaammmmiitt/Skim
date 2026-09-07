import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Import the individual tile for isolated testing rather than
// going through the module-level singleton store.
import { ToastProvider, toast } from "@/components/ui/Toast";

describe("Toast", () => {
  it("renders a success toast and shows its message", async () => {
    vi.useFakeTimers();
    render(<ToastProvider />);
    act(() => { toast.success("Saved successfully"); });
    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders an error toast and shows its message", async () => {
    vi.useFakeTimers();
    render(<ToastProvider />);
    act(() => { toast.error("Something went wrong"); });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders an info toast and shows its message", async () => {
    vi.useFakeTimers();
    render(<ToastProvider />);
    act(() => { toast.info("Digest updated"); });
    expect(screen.getByText("Digest updated")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("dismiss button is present with accessible label", () => {
    vi.useFakeTimers();
    render(<ToastProvider />);
    act(() => { toast.info("Hello world"); });
    expect(screen.getByText("Hello world")).toBeInTheDocument();
    // At least one dismiss button should be present
    const dismissBtns = screen.getAllByRole("button", { name: /dismiss/i });
    expect(dismissBtns.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });


  it("all toasts have role=alert", () => {
    vi.useFakeTimers();
    render(<ToastProvider />);
    act(() => { toast.success("A"); });
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});
