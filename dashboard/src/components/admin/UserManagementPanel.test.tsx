import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";

describe("UserManagementPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            users: [
              {
                id: "1",
                email: "active@example.com",
                display_name: "Active User",
                status: "active",
                role: "member",
                digest_active: true,
              },
              {
                id: "2",
                email: "suspended@example.com",
                display_name: "Suspended User",
                status: "suspended",
                role: "member",
                digest_active: false,
              },
            ],
          }),
        })
      )
    );
  });

  it("loads and displays users", async () => {
    render(<UserManagementPanel />);

    // Shows loading state initially
    expect(screen.getByText("Loading users…")).toBeInTheDocument();

    // Waits for fetch to resolve and displays users
    await waitFor(() => {
      expect(screen.getByText("active@example.com")).toBeInTheDocument();
      expect(screen.getByText("suspended@example.com")).toBeInTheDocument();
    });

    // Checks for specific status badges
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("SUSPENDED")).toBeInTheDocument();
    expect(screen.getByText("DIGEST ON")).toBeInTheDocument();
    expect(screen.getByText("DIGEST HALTED")).toBeInTheDocument();

    // Check for buttons
    expect(screen.getByRole("button", { name: "Suspend User" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Halt Digest" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reactivate" })).toBeInTheDocument();
  });
});
