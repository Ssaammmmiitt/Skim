import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DigestPreferenceForm } from "@/components/settings/DigestPreferenceForm";
import { resetPreferencesStore } from "@/store/preferences-store";

/** Shared base initial values — update both fields here if types change. */
const baseInitial = {
  theme: "cyan" as const,
  format: "full" as const,
  max_stories: 8,
  topic_filters: [] as string[],
  email_enabled: true,
  dashboard_theme: "dark" as const,
  font_style: "sans" as const,
  summary_style: "prose" as const,
};

describe("DigestPreferenceForm", () => {
  beforeEach(() => {
    resetPreferencesStore();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ preferences: {} }),
        })
      )
    );
  });

  it("renders theme and format options", () => {
    render(<DigestPreferenceForm initial={baseInitial} />);

    expect(screen.getByText("Dashboard appearance")).toBeInTheDocument();
    expect(screen.getByText("Email theme")).toBeInTheDocument();
    expect(screen.getByText("Content format")).toBeInTheDocument();
  });

  it("toggles topic filters and saves preferences", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(<DigestPreferenceForm initial={baseInitial} />);

    await user.click(screen.getByRole("button", { name: "AI / ML" }));
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: "cyan",
          format: "full",
          max_stories: 8,
          topic_filters: ["ai_ml"],
          email_enabled: true,
          dashboard_theme: "dark",
          font_style: "sans",
          summary_style: "prose",
        }),
      });
    });

    expect(await screen.findByText("Preferences saved.")).toBeInTheDocument();
  });

  it("shows retry when save fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: "Server error" }),
        })
      )
    );

    render(<DigestPreferenceForm initial={baseInitial} />);

    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
