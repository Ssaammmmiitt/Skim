import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { pendingMember } from "@/test/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("AdminPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
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

  it("displays pending users from initial data", () => {
    render(<AdminPanel initialPending={[pendingMember]} />);
    expect(screen.getByText(pendingMember.email)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("approves a pending user", async () => {
    const user = userEvent.setup();
    render(<AdminPanel initialPending={[pendingMember]} />);

    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByText("User approved.")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText("No pending signup requests.")
      ).toBeInTheDocument();
    });
  });

  it("shows retry when approve action fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: "Forbidden" }),
        })
      )
    );

    render(<AdminPanel initialPending={[pendingMember]} />);

    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Action failed. Check your connection and try again."
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
