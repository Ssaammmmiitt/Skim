import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "@/components/DatePicker";

describe("DatePicker", () => {
  const maxDate = "2026-08-30";
  const availableDates = ["2026-08-30", "2026-08-28"];

  it("shows digest availability status", () => {
    render(
      <DatePicker
        value="2026-08-30"
        maxDate={maxDate}
        availableDates={availableDates}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText(/Digest available for this date/)).toBeInTheDocument();
    expect(screen.getByText(/2 archived days/)).toBeInTheDocument();
  });

  it("calls onChange for prev, next, today, and quick-pick", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DatePicker
        value="2026-08-29"
        maxDate={maxDate}
        availableDates={availableDates}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "Previous day" }));
    expect(onChange).toHaveBeenCalledWith("2026-08-28");

    await user.click(screen.getByRole("button", { name: "Next day" }));
    expect(onChange).toHaveBeenCalledWith("2026-08-30");

    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledWith(maxDate);

    await user.click(screen.getByRole("button", { name: "2026-08-28" }));
    expect(onChange).toHaveBeenCalledWith("2026-08-28");
  });

  it("disables next button on max date", () => {
    render(
      <DatePicker
        value={maxDate}
        maxDate={maxDate}
        availableDates={availableDates}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Next day" })).toBeDisabled();
  });
});
