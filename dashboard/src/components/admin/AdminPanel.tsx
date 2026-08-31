"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/auth/types";

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
        <p className="skim-card p-6 skim-body">No pending signup requests.</p>
      ) : (
        pending.map((user) => (
          <div
            key={user.id}
            className="skim-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">
                {user.display_name ?? user.email}
              </p>
              <p className="skim-body">{user.email}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                Requested {new Date(user.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void review(user.id, "approve")}
                className="skim-btn-primary"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => void review(user.id, "reject")}
                className="skim-btn-danger"
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
      {message ? <p className="skim-success">{message}</p> : null}
    </div>
  );
}
