"use client";

import { useEffect } from "react";
import { DatePicker } from "@/components/archive/DatePicker";
import { DigestFeed } from "@/components/digest/DigestFeed";
import { PageHeader } from "@/components/layout/PageHeader";
import { DigestFeedSkeleton } from "@/components/ui/DigestFeedSkeleton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { useArchiveStore } from "@/store/archive-store";
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
  const date = useArchiveStore((state) => state.date);
  const digest = useArchiveStore((state) => state.digest);
  const availableDates = useArchiveStore((state) => state.availableDates);
  const loading = useArchiveStore((state) => state.loading);
  const error = useArchiveStore((state) => state.error);
  const hydrate = useArchiveStore((state) => state.hydrate);
  const fetchAvailableDates = useArchiveStore((state) => state.fetchAvailableDates);
  const selectDate = useArchiveStore((state) => state.selectDate);

  useEffect(() => {
    hydrate({
      date: initialDate,
      digest: initialDigest,
      availableDates: initialAvailableDates,
    });
  }, [hydrate, initialDate, initialDigest, initialAvailableDates]);

  useEffect(() => {
    void fetchAvailableDates();
  }, [fetchAvailableDates]);

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
        onChange={(nextDate) => void selectDate(nextDate)}
      />

      {loading ? <DigestFeedSkeleton cards={4} /> : null}

      {error ? (
        <ErrorAlert
          message={error}
          onRetry={() => void selectDate(date)}
        />
      ) : null}

      {!loading && !error && digest ? (
        <DigestFeed digest={digest} isToday={date === maxDate} />
      ) : null}
    </div>
  );
}
