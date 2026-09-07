import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, StatusBadge, CountBadge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Live</Badge>);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("applies cyan variant class", () => {
    render(<Badge variant="cyan">Cyan</Badge>);
    const el = screen.getByText("Cyan");
    expect(el.className).toMatch(/cyan/);
  });

  it("applies warning variant", () => {
    render(<Badge variant="warning">Warn</Badge>);
    const el = screen.getByText("Warn");
    expect(el.className).toContain("fbbf24");
  });

  it("applies error variant", () => {
    render(<Badge variant="error">Error</Badge>);
    const el = screen.getByText("Error");
    expect(el.className).toMatch(/error/);
  });
});

describe("StatusBadge", () => {
  it("renders success variant with correct label", () => {
    render(<StatusBadge variant="success" />);
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("renders custom label", () => {
    render(<StatusBadge variant="running" label="In progress" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("renders failed variant", () => {
    render(<StatusBadge variant="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows pulse dot for running state by default", () => {
    const { container } = render(<StatusBadge variant="running" />);
    // animate-ping indicates the pulsing dot
    expect(container.querySelector(".animate-ping")).toBeInTheDocument();
  });

  it("does not show pulse for success", () => {
    const { container } = render(<StatusBadge variant="success" />);
    expect(container.querySelector(".animate-ping")).not.toBeInTheDocument();
  });
});

describe("CountBadge", () => {
  it("renders count", () => {
    render(<CountBadge count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("caps at max value", () => {
    render(<CountBadge count={15} max={9} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<CountBadge count={5} label="5 notifications" />);
    expect(screen.getByLabelText("5 notifications")).toBeInTheDocument();
  });
});
