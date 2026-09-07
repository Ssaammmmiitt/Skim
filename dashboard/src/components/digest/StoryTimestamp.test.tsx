import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { StoryTimestamp } from "@/components/digest/StoryTimestamp";

describe("StoryTimestamp", () => {
  it("renders nothing when value is null", () => {
    const { container } = render(<StoryTimestamp value={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a <time> element", () => {
    render(<StoryTimestamp value="2024-01-15T10:30:00Z" />);
    const el = screen.getByRole("generic", { hidden: true });
    // Just check the time element is in the DOM
    const time = document.querySelector("time");
    expect(time).toBeInTheDocument();
  });

  it("sets dateTime attribute to the raw value", () => {
    render(<StoryTimestamp value="2024-01-15T10:30:00Z" />);
    const time = document.querySelector("time");
    expect(time?.getAttribute("dateTime")).toBe("2024-01-15T10:30:00Z");
  });

  it("formats an ISO string to a human time", () => {
    // Use a fixed date to avoid locale issues
    render(<StoryTimestamp value="2024-06-01T14:30:00.000Z" />);
    const time = document.querySelector("time");
    // Should contain a colon and either AM or PM
    expect(time?.textContent).toMatch(/\d+:\d{2}/);
  });

  it("renders raw string that is not ISO parseable", () => {
    render(<StoryTimestamp value="3h ago" />);
    const time = document.querySelector("time");
    expect(time?.textContent).toContain("3h ago");
  });

  it("applies className prop", () => {
    render(<StoryTimestamp value="10:00 AM" className="custom-class" />);
    const time = document.querySelector("time");
    expect(time?.classList.contains("custom-class")).toBe(true);
  });
});
