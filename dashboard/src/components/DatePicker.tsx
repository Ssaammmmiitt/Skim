"use client";

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
    <div className="rounded-[20px] border border-[#243044] bg-[#1a2332] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(shiftDate(value, -1))}
          className="rounded-full border border-[#243044] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#94a3b8] hover:border-[#06b6d4] hover:text-[#22d3ee]"
          aria-label="Previous day"
        >
          ← Prev
        </button>

        <input
          type="date"
          value={value}
          max={maxDate}
          onChange={handleInputChange}
          className="rounded-lg border border-[#243044] bg-[#0f1419] px-3 py-2 text-sm text-[#f0f9ff] outline-none focus:border-[#06b6d4]"
        />

        <button
          type="button"
          onClick={() => onChange(shiftDate(value, 1))}
          disabled={atMax}
          className="rounded-full border border-[#243044] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#94a3b8] hover:border-[#06b6d4] hover:text-[#22d3ee] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next day"
        >
          Next →
        </button>

        <button
          type="button"
          onClick={() => onChange(maxDate)}
          className="ml-auto rounded-full bg-[#06b6d4] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black hover:bg-[#22d3ee]"
        >
          Today
        </button>
      </div>

      <p className="mt-3 text-xs text-[#64748b]">
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
              className={`rounded-2xl px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                date === value
                  ? "bg-[#06b6d4] text-black"
                  : "bg-[#164e63] text-[#67e8f9] hover:bg-[#0891b2]"
              }`}
            >
              {date}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
