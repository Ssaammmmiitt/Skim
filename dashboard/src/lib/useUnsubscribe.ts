"use client";

import { useCallback, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { usePreferencesStore } from "@/store/preferences-store";

type UseUnsubscribeReturn = {
  unsubscribe: () => Promise<void>;
  resubscribe: () => Promise<void>;
  loading: boolean;
};

/**
 * Client hook for instant digest email subscription management.
 *
 * Calls the dedicated /api/settings/unsubscribe endpoint (POST to unsubscribe,
 * PUT to re-enable) without requiring a full form save.
 * Fires a toast and updates the preferences store draft on success.
 */
export function useUnsubscribe(): UseUnsubscribeReturn {
  const [loading, setLoading] = useState(false);
  const updateDraft = usePreferencesStore((state) => state.updateDraft);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/unsubscribe", { method: "POST" });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unsubscribe failed");
      }

      // Sync the preferences store so the Settings form reflects the change
      updateDraft({ email_enabled: false });

      toast.info(
        "Unsubscribed from daily digest. You can re-enable anytime in Settings.",
        6000
      );
    } catch (err) {
      console.error("[useUnsubscribe] unsubscribe error:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to unsubscribe. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [updateDraft]);

  const resubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/unsubscribe", { method: "PUT" });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Re-enable failed");
      }

      updateDraft({ email_enabled: true });

      toast.success("Daily digest re-enabled! You'll receive tomorrow's briefing.");
    } catch (err) {
      console.error("[useUnsubscribe] resubscribe error:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to re-enable emails. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [updateDraft]);

  return { unsubscribe, resubscribe, loading };
}
