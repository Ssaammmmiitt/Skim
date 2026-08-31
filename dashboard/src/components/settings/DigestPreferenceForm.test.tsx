import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DigestPreferenceForm } from "@/components/settings/DigestPreferenceForm";

describe("DigestPreferenceForm", () => {
  beforeEach(() => {
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
    render(
      <DigestPreferenceForm
        initial={{
          theme: "cyan",
          format: "full",
          max_stories: 8,
          topic_filters: [],
          email_enabled: true,
          dashboard_theme: "dark",
        }}
      />
    );

    expect(screen.getByText("Dashboard appearance")).toBeInTheDocument();
    expect(screen.getByText("Email theme")).toBeInTheDocument();
    expect(screen.getByText("Email content format")).toBeInTheDocument();
    expect(screen.getByText("Max stories: 8")).toBeInTheDocument();
  });

  it("toggles topic filters and saves preferences", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(
      <DigestPreferenceForm
        initial={{
          theme: "cyan",
          format: "full",
          max_stories: 8,
          topic_filters: [],
          email_enabled: true,
          dashboard_theme: "dark",
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "AI / ML" }));
    await user.click(screen.getByRole("button", { name: "Save all preferences" }));

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
        }),
      });
    });

    expect(await screen.findByText("Preferences saved.")).toBeInTheDocument();
  });
});
