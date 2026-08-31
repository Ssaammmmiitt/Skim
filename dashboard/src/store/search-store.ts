import { create } from "zustand";
import type { SearchResponse } from "@/lib/types";

type SearchState = {
  results: SearchResponse | null;
  loading: boolean;
  error: string | null;
  fetchSearch: (query: string) => Promise<void>;
  reset: () => void;
};

const initialSearchState = {
  results: null as SearchResponse | null,
  loading: false,
  error: null as string | null,
};

export const useSearchStore = create<SearchState>((set) => ({
  ...initialSearchState,

  fetchSearch: async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      set({ results: null, error: null, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}&limit=25`
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Search failed");
      }
      set({ results: body as SearchResponse, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Search failed",
        loading: false,
      });
    }
  },

  reset: () => set(initialSearchState),
}));

export function resetSearchStore(): void {
  useSearchStore.getState().reset();
}
