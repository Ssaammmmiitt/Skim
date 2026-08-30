"use client";

import { useCallback, useEffect, useState } from "react";
import { DatePicker } from "@/components/DatePicker";
import { DigestFeed } from "@/components/DigestFeed";
import { todayUtc } from "@/lib/digests";
import type { DigestResponse } from "@/lib/types";

type ArchiveViewProps = {
  initialDate: string;
  initialDigest: DigestResponse;
  availableDates: string[];
};

export function ArchiveView({
  initialDate,
  initialDigest,
  availableDates: initialAvailableDates,
}: ArchiveViewProps) {
  const maxDate = todayUtc();
  const [date, setDate] = useState(initialDate);
  const [digest, setDigest] = useState(initialDigest);
  const [availableDates, setAvailableDates] = useState(initialAvailableDates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDigest = useCallback(async (nextDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/digests?date=${nextDate}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load digest");
      }
      const data = (await response.json()) as DigestResponse;
      setDigest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load digest");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/digests/dates")
      .then((response) => response.json())
      .then((body) => {
        if (Array.isArray(body.dates)) {
          setAvailableDates(body.dates);
        }
      })
      .catch(() => {
        // Keep server-provided dates on failure.
      });
  }, []);

  function handleDateChange(nextDate: string) {
    if (nextDate === date) return;
    setDate(nextDate);
    window.history.replaceState(null, "", `/archive?date=${nextDate}`);
    void loadDigest(nextDate);
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22d3ee]">
          Archive
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#f0f9ff]">Past digests</h1>
        <p className="mt-2 text-sm text-[#94a3b8]">
          Browse any day Skim sent a briefing. Pick a date or jump to a recent
          digest below.
        </p>
      </header>

      <DatePicker
        value={date}
        maxDate={maxDate}
        availableDates={availableDates}
        onChange={handleDateChange}
      />

      {loading ? (
        <p className="text-center text-sm text-[#64748b]">Loading digest…</p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-[#450a0a] bg-[#450a0a]/30 px-4 py-3 text-sm text-[#f87171]">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <DigestFeed digest={digest} isToday={date === maxDate} />
      ) : null}
    </div>
  );
}
