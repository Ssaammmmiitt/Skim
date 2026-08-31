import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { pendingMember } from "@/test/fixtures";

describe("AdminPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [pendingMember] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [] }),
        })
    );
  });

  it("loads and displays pending users", async () => {
    render(<AdminPanel />);
    expect(await screen.findByText(pendingMember.email)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("approves a pending user", async () => {
    const user = userEvent.setup();
    render(<AdminPanel />);

    await screen.findByText(pendingMember.email);
    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByText("User approved.")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText("No pending signup requests.")
      ).toBeInTheDocument();
    });
  });
});
