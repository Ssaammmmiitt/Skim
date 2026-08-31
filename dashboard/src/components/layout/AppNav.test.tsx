import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "@/components/layout/AppNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/archive",
}));

vi.mock("@/components/ui/SearchBar", () => ({
  SearchBar: () => <input aria-label="Search articles" />,
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
    render(<AppNav profile={profile} />);

    const archiveLink = screen.getByRole("link", { name: "Archive" });
    expect(archiveLink).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "Admin" }).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Search articles")).toBeInTheDocument();
  });
});
