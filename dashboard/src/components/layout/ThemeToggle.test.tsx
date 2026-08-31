import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { resetThemeStore, useThemeStore } from "@/store/theme-store";

describe("ThemeToggle", () => {
  beforeEach(() => {
    resetThemeStore();
    useThemeStore.setState({
      theme: "dark",
      resolved: "dark",
      saving: false,
      hydrated: true,
    });
  });

  it("renders theme options and calls setTheme", async () => {
    const setTheme = vi.fn();
    useThemeStore.setState({ setTheme });
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
