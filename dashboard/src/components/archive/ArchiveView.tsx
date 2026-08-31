"use client";

import { useCallback, useEffect, useState } from "react";
import { DatePicker } from "@/components/archive/DatePicker";
import { DigestFeed } from "@/components/digest/DigestFeed";
import { PageHeader } from "@/components/layout/PageHeader";
import { DigestFeedSkeleton } from "@/components/ui/DigestFeedSkeleton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
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
      <PageHeader
        eyebrow="Archive"
        title="Past digests"
        description="Browse any day Skim sent a briefing. Pick a date or jump to a recent digest below."
      />

      <DatePicker
        value={date}
        maxDate={maxDate}
        availableDates={availableDates}
        onChange={handleDateChange}
      />

      {loading ? <DigestFeedSkeleton cards={4} /> : null}

      {error ? <ErrorAlert message={error} /> : null}

      {!loading && !error ? (
        <DigestFeed digest={digest} isToday={date === maxDate} />
      ) : null}
    </div>
  );
}
