"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Profile } from "@/lib/auth/types";
import { cn } from "@/lib/cn";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import * as ui from "@/lib/tailwind-ui";

type AdminProfile = Profile & { digest_active?: boolean };

export function UserManagementPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);

  async function loadUsers() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users?status=all");
      if (!response.ok) {
        throw new Error("Could not load users.");
      }
      const data = (await response.json()) as { users?: AdminProfile[] };
      // Filter out pending users, as they are handled in the Pending tab
      setUsers((data.users ?? []).filter((u) => u.status !== "pending"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleAction(userId: string, action: "suspend" | "reactivate" | "halt_digest" | "resume_digest") {
    setError(null);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });

    if (response.ok) {
      toast.success("Action successful.");
      await loadUsers();
      router.refresh();
      return;
    }
    
    let errMsg = "Action failed.";
    try {
      const errData = await response.json();
      if (errData.error) errMsg = errData.error;
    } catch {
      // Ignore parse error
    }
    toast.error(errMsg);
  }

  if (error) {
    return (
      <div className="mt-8">
        <ErrorAlert message={error} onRetry={() => void loadUsers()} />
      </div>
    );
  }

  if (refreshing && users.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          eyebrow="Loading"
          title="Loading users…"
          description="Please wait while we fetch the user list."
        />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          eyebrow="No users"
          title="No registered users found."
          description="Approved and suspended users will appear here."
        />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {users.map((user) => (
        <div
          key={user.id}
          className={cn(
            ui.card,
            "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between",
            refreshing && "opacity-60"
          )}
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">
                {user.display_name ?? user.email}
              </p>
              {user.role === "superuser" && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                  Superuser
                </span>
              )}
            </div>
            <p className={ui.body}>{user.email}</p>
            <div className="mt-2 flex items-center gap-3 text-xs tracking-wide text-muted">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    user.status === "active"
                      ? "bg-emerald-500"
                      : user.status === "suspended"
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  )}
                />
                {user.status.toUpperCase()}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                {user.digest_active ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    DIGEST ON
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    DIGEST HALTED
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.role !== "superuser" && (
              <>
                {user.status === "active" ? (
                  <button
                    type="button"
                    onClick={() => void handleAction(user.id, "suspend")}
                    disabled={refreshing}
                    className={ui.btnDanger}
                  >
                    Suspend User
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleAction(user.id, "reactivate")}
                    disabled={refreshing}
                    className={ui.btnPrimary}
                  >
                    Reactivate
                  </button>
                )}

                {user.status === "active" && (
                  user.digest_active ? (
                    <button
                      type="button"
                      onClick={() => void handleAction(user.id, "halt_digest")}
                      disabled={refreshing}
                      className={ui.btnSecondary}
                    >
                      Halt Digest
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleAction(user.id, "resume_digest")}
                      disabled={refreshing}
                      className={ui.btnSecondary}
                    >
                      Resume Digest
                    </button>
                  )
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
