import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchiveView } from "@/components/ArchiveView";
import { emptyDigest, sampleDigest } from "@/test/fixtures";

describe("ArchiveView", () => {
  beforeEach(() => {
    vi.stubGlobal("history", {
      ...window.history,
      replaceState: vi.fn(),
    });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders initial digest", () => {
    render(
      <ArchiveView
        initialDate="2026-08-30"
        initialDigest={sampleDigest}
        availableDates={["2026-08-30", "2026-08-28"]}
      />
    );

    expect(screen.getByText("Past digests")).toBeInTheDocument();
    expect(screen.getByText(sampleDigest.articles[0].title)).toBeInTheDocument();
  });

  it("loads a new digest when date changes", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/digests/dates")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ dates: ["2026-08-30", "2026-08-28"] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ...emptyDigest,
          date: "2026-08-28",
          subject: "Older digest",
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ArchiveView
        initialDate="2026-08-30"
        initialDigest={sampleDigest}
        availableDates={["2026-08-30", "2026-08-28"]}
      />
    );

    await user.click(screen.getByRole("button", { name: "2026-08-28" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/digests?date=2026-08-28"
      );
    });
    expect(
      screen.queryByText("Today's briefing hasn't been sent yet")
    ).not.toBeInTheDocument();
    expect(await screen.findByText(/Nothing for/)).toBeInTheDocument();
  });
});
