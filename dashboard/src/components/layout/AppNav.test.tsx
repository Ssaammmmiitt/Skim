import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "@/components/layout/AppNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/archive",
}));

vi.mock("@/components/ui/SearchBar", () => ({
  SearchBar: () => <input aria-label="Search articles" />,
}));

vi.mock("@/components/layout/ThemeToggle", () => ({
  ThemeToggle: () => <div aria-label="Theme toggle" />,
}));

const profile = {
  email: "admin@example.com",
  display_name: "Admin",
  avatar_url: null,
  role: "superuser",
  status: "active",
};

describe("AppNav", () => {
  it("highlights the active route and shows admin link", () => {
    render(<AppNav profile={profile} pendingApprovalCount={2} />);

    const archiveLinks = screen.getAllByRole("link", { name: "Archive" });
    expect(
      archiveLinks.some((link) => link.getAttribute("aria-current") === "page")
    ).toBe(true);
    expect(screen.getAllByRole("link", { name: /Admin/ }).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("2 pending approvals")).toHaveTextContent("2");
    expect(screen.getAllByLabelText("Search articles").length).toBeGreaterThan(0);
  });
});
