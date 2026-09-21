import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AdminTabs } from "@/components/admin/AdminTabs";
import type { Profile } from "@/lib/auth/types";

describe("AdminTabs", () => {
  const mockPending: Profile[] = [
    {
      id: "user-1",
      email: "test@example.com",
      display_name: "Test User",
      role: "member",
      status: "pending",
      created_at: new Date().toISOString(),
      approved_at: null,
      avatar_url: null,
    },
  ];

  it("renders both tabs and defaults to Pending", () => {
    render(<AdminTabs initialPending={mockPending} />);
    
    expect(screen.getByRole("button", { name: /Pending Approvals/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All Users/i })).toBeInTheDocument();
    
    // Shows pending count
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("switches tabs when clicked", async () => {
    const user = userEvent.setup();
    render(<AdminTabs initialPending={mockPending} />);
    
    const allUsersTab = screen.getByRole("button", { name: /All Users/i });
    await user.click(allUsersTab);
    
    expect(allUsersTab).toHaveAttribute("aria-current", "page");
  });
});
