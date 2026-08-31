"use client";

import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDate(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().split("T")[0];
}

type DatePickerProps = {
  value: string;
  maxDate: string;
  availableDates: string[];
  onChange: (date: string) => void;
};

export function DatePicker({
  value,
  maxDate,
  availableDates,
  onChange,
}: DatePickerProps) {
  const available = new Set(availableDates);
  const hasDigest = available.has(value);
  const atMax = value >= maxDate;

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (DATE_RE.test(next) && next <= maxDate) {
      onChange(next);
    }
  }

  return (
    <div className={cn(ui.card, "p-4 sm:p-5")}>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onChange(shiftDate(value, -1))}
          className={ui.btnSecondary}
          aria-label="Previous day"
        >
          ← Prev
        </button>

        <input
          type="date"
          value={value}
          max={maxDate}
          onChange={handleInputChange}
          className={cn(ui.input, "w-auto py-2")}
        />

        <button
          type="button"
          onClick={() => onChange(shiftDate(value, 1))}
          disabled={atMax}
          className={ui.btnSecondary}
          aria-label="Next day"
        >
          Next →
        </button>

        <button
          type="button"
          onClick={() => onChange(maxDate)}
          className={cn(ui.btnPrimary, "sm:ml-auto")}
        >
          Today
        </button>
      </div>

      <p className="mt-3 text-xs text-muted">
        {hasDigest
          ? "Digest available for this date"
          : "No digest on file for this date"}
        {availableDates.length > 0
          ? ` · ${availableDates.length} archived day${availableDates.length === 1 ? "" : "s"}`
          : null}
      </p>

      {availableDates.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {availableDates.slice(0, 14).map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => onChange(date)}
              className={
                date === value
                  ? "rounded-xl bg-cyan-core px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-black"
                  : "rounded-xl bg-cyan-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-glow hover:bg-cyan-deep"
              }
            >
              {date}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
