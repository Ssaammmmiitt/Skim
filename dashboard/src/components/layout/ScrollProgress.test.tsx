import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollProgress } from "@/components/layout/ScrollProgress";

describe("ScrollProgress", () => {
  it("renders a div element", () => {
    const { container } = render(<ScrollProgress />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
  });

  it("has aria-hidden to avoid screen reader noise", () => {
    const { container } = render(<ScrollProgress />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("has role=presentation", () => {
    const { container } = render(<ScrollProgress />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("role")).toBe("presentation");
  });

  it("applies scroll-progress-bar class", () => {
    const { container } = render(<ScrollProgress />);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains("scroll-progress-bar")).toBe(true);
  });
});
