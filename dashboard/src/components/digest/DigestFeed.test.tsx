import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DigestFeed } from "@/components/digest/DigestFeed";
import { emptyDigest, sampleDigest } from "@/test/fixtures";

describe("DigestFeed", () => {
  it("renders articles in order with metadata", () => {
    render(<DigestFeed digest={sampleDigest} />);

    expect(screen.getByText("Skim Daily Digest")).toBeInTheDocument();
    expect(screen.getByText("2 stories")).toBeInTheDocument();
    expect(screen.getByText(sampleDigest.articles[0].title)).toBeInTheDocument();
    expect(screen.getByText(sampleDigest.articles[1].title)).toBeInTheDocument();
  });

  it("shows today empty state", () => {
    render(<DigestFeed digest={emptyDigest} isToday />);
    expect(
      screen.getByText("Today's briefing hasn't been sent yet")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse archive" })).toHaveAttribute(
      "href",
      "/archive"
    );
  });

  it("shows archive empty state for non-today dates", () => {
    render(<DigestFeed digest={{ ...emptyDigest, date: "2026-08-20" }} />);
    expect(screen.getByText(/Nothing for/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Browse archive" })
    ).not.toBeInTheDocument();
  });
});
