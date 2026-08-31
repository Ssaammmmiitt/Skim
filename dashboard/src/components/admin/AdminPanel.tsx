"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Profile } from "@/lib/auth/types";
import { cn } from "@/lib/cn";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import * as ui from "@/lib/tailwind-ui";

type AdminPanelProps = {
  initialPending: Profile[];
};

export function AdminPanel({ initialPending }: AdminPanelProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Profile[]>(initialPending);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshPending() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users?status=pending");
      if (!response.ok) {
        throw new Error("Could not load pending users.");
      }
      const data = (await response.json()) as { users?: Profile[] };
      setPending(data.users ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load pending users."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function review(userId: string, action: "approve" | "reject") {
    setMessage("");
    setError(null);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    if (response.ok) {
      setMessage(action === "approve" ? "User approved." : "User rejected.");
      await refreshPending();
      router.refresh();
      return;
    }
    setError("Action failed. Check your connection and try again.");
  }

  return (
    <div className="mt-8 space-y-4">
      {error ? (
        <ErrorAlert message={error} onRetry={() => void refreshPending()} />
      ) : null}

      {refreshing && pending.length === 0 ? (
        <p className={cn(ui.card, "p-6", ui.body)}>Loading pending users…</p>
      ) : pending.length === 0 ? (
        <p className={cn(ui.card, "p-6", ui.body)}>
          No pending signup requests.
        </p>
      ) : (
        pending.map((user) => (
          <div
            key={user.id}
            className={cn(
              ui.card,
              "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between",
              refreshing && "opacity-60"
            )}
          >
            <div>
              <p className="font-medium text-foreground">
                {user.display_name ?? user.email}
              </p>
              <p className={ui.body}>{user.email}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                Requested {new Date(user.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void review(user.id, "approve")}
                disabled={refreshing}
                className={ui.btnPrimary}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => void review(user.id, "reject")}
                disabled={refreshing}
                className={ui.btnDanger}
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
      {message ? <p className={ui.successText}>{message}</p> : null}
    </div>
  );
}
