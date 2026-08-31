import { create } from "zustand";
import type {
  DashboardTheme,
  DigestFormat,
  DigestTheme,
} from "@/lib/auth/types";
import { useThemeStore } from "@/store/theme-store";

export type PreferencesDraft = {
  theme: DigestTheme;
  format: DigestFormat;
  max_stories: number;
  topic_filters: string[];
  email_enabled: boolean;
  dashboard_theme: DashboardTheme;
};

type PreferencesState = {
  draft: PreferencesDraft;
  status: string;
  saveError: string | null;
  saving: boolean;
  dirty: boolean;
  hydrate: (initial: PreferencesDraft) => void;
  updateDraft: (patch: Partial<PreferencesDraft>) => void;
  toggleTopic: (topicId: string) => void;
  save: () => Promise<boolean>;
  reset: () => void;
};

const emptyDraft: PreferencesDraft = {
  theme: "cyan",
  format: "full",
  max_stories: 8,
  topic_filters: [],
  email_enabled: true,
  dashboard_theme: "dark",
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  draft: emptyDraft,
  status: "",
  saveError: null,
  saving: false,
  dirty: false,

  hydrate: (initial) => {
    set({ draft: initial, status: "", saveError: null, saving: false, dirty: false });
  },

  updateDraft: (patch) => {
    set((state) => ({
      draft: { ...state.draft, ...patch },
      dirty: true,
      status: "",
      saveError: null,
    }));
  },

  toggleTopic: (topicId) => {
    set((state) => {
      const current = state.draft.topic_filters;
      const topic_filters = current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId];
      return {
        draft: { ...state.draft, topic_filters },
        dirty: true,
        status: "",
        saveError: null,
      };
    });
  },

  save: async () => {
    const { draft } = get();
    set({ saving: true, status: "", saveError: null });

    try {
      const response = await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: draft.theme,
          format: draft.format,
          max_stories: draft.max_stories,
          topic_filters: draft.topic_filters.length ? draft.topic_filters : null,
          email_enabled: draft.email_enabled,
          dashboard_theme: draft.dashboard_theme,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save preferences.");
      }

      useThemeStore.getState().applyTheme(draft.dashboard_theme);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("skim-dashboard-theme", draft.dashboard_theme);
        } catch {
          // localStorage unavailable in some test environments.
        }
      }
      set({ status: "Preferences saved.", dirty: false, saving: false });
      return true;
    } catch (err) {
      set({
        saveError:
          err instanceof Error
            ? err.message
            : "Could not save preferences. Check your connection and try again.",
        saving: false,
      });
      return false;
    }
  },

  reset: () => {
    set({
      draft: emptyDraft,
      status: "",
      saveError: null,
      saving: false,
      dirty: false,
    });
  },
}));

export function resetPreferencesStore(): void {
  usePreferencesStore.getState().reset();
}
