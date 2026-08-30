import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DigestCard } from "@/components/DigestCard";
import { sampleArticle } from "@/test/fixtures";

describe("DigestCard", () => {
  it("renders rank, title, source, and links", () => {
    render(<DigestCard article={sampleArticle} rank={1} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(sampleArticle.title)).toBeInTheDocument();
    expect(screen.getByText("TechCrunch")).toBeInTheDocument();
    expect(screen.getByText(sampleArticle.key_takeaway!)).toBeInTheDocument();
    expect(screen.getByText(sampleArticle.insight!)).toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: sampleArticle.title });
    expect(links[0]).toHaveAttribute("href", sampleArticle.url);
    expect(links[0]).toHaveAttribute("target", "_blank");
  });

  it("shows importance score when present", () => {
    render(<DigestCard article={sampleArticle} rank={2} />);
    expect(screen.getByText("Score 8.7")).toBeInTheDocument();
  });

  it("falls back to summary when insight is missing", () => {
    const article = { ...sampleArticle, insight: null };
    render(<DigestCard article={article} rank={3} />);
    expect(screen.getByText(article.summary!)).toBeInTheDocument();
  });

  it("shows relative time for recent articles", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T15:00:00.000Z"));
    render(<DigestCard article={sampleArticle} rank={1} />);
    expect(screen.getByText(/3h ago/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});
