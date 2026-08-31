"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/auth/types";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

export function AdminPanel() {
  const [pending, setPending] = useState<Profile[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/users?status=pending");
    if (response.ok) {
      const data = await response.json();
      setPending(data.users ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(userId: string, action: "approve" | "reject") {
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    if (response.ok) {
      setMessage(action === "approve" ? "User approved." : "User rejected.");
      void load();
    } else {
      setMessage("Action failed.");
    }
  }

  return (
    <div className="mt-8 space-y-4">
      {pending.length === 0 ? (
        <p className={cn(ui.card, "p-6", ui.body)}>
          No pending signup requests.
        </p>
      ) : (
        pending.map((user) => (
          <div
            key={user.id}
            className={cn(
              ui.card,
              "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
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
                className={ui.btnPrimary}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => void review(user.id, "reject")}
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
