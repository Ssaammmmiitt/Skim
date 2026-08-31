import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPendingBanner } from "@/components/layout/AdminPendingBanner";

const mockPathname = vi.fn(() => "/");

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

describe("AdminPendingBanner", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  it("shows banner when users are pending", () => {
    render(<AdminPendingBanner count={2} />);
    expect(
      screen.getByText(/2 users are waiting for approval/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review signups" })
    ).toHaveAttribute("href", "/admin");
  });

  it("hides when count is zero", () => {
    const { container } = render(<AdminPendingBanner count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("hides on the admin page", () => {
    mockPathname.mockReturnValue("/admin");
    const { container } = render(<AdminPendingBanner count={3} />);
    expect(container).toBeEmptyDOMElement();
  });
});
