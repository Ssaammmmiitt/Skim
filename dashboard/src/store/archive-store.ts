import { create } from "zustand";
import type { DigestResponse } from "@/lib/types";

type ArchiveState = {
  date: string;
  digest: DigestResponse | null;
  availableDates: string[];
  loading: boolean;
  error: string | null;
  hydrate: (payload: {
    date: string;
    digest: DigestResponse;
    availableDates: string[];
  }) => void;
  fetchAvailableDates: () => Promise<void>;
  selectDate: (nextDate: string) => Promise<void>;
  reset: () => void;
};

const initialArchiveState = {
  date: "",
  digest: null as DigestResponse | null,
  availableDates: [] as string[],
  loading: false,
  error: null as string | null,
};

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  ...initialArchiveState,

  hydrate: ({ date, digest, availableDates }) => {
    set({ date, digest, availableDates, loading: false, error: null });
  },

  fetchAvailableDates: async () => {
    try {
      const response = await fetch("/api/digests/dates");
      const body = await response.json();
      if (Array.isArray(body.dates)) {
        set({ availableDates: body.dates });
      }
    } catch {
      // Keep server-provided dates on failure.
    }
  },

  selectDate: async (nextDate) => {
    if (nextDate === get().date) return;

    set({ date: nextDate, loading: true, error: null });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/archive?date=${nextDate}`);
    }

    try {
      const response = await fetch(`/api/digests?date=${nextDate}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load digest");
      }
      const data = (await response.json()) as DigestResponse;
      set({ digest: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load digest",
        loading: false,
      });
    }
  },

  reset: () => set(initialArchiveState),
}));

export function resetArchiveStore(): void {
  useArchiveStore.getState().reset();
}
