import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const setTheme = vi.fn();

vi.mock("@/components/theme/ThemeProvider", () => ({
  useDashboardTheme: () => ({
    theme: "dark",
    resolved: "dark",
    setTheme,
    saving: false,
  }),
}));

describe("ThemeToggle", () => {
  it("renders theme options and calls setTheme", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByTitle("Light"));
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("renders menu variant with labels", () => {
    render(<ThemeToggle variant="menu" />);
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });
});
