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
    load();
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
      load();
    } else {
      setMessage("Action failed.");
    }
  }

  return (
    <div className="mt-8 space-y-4">
      {pending.length === 0 ? (
        <p className="rounded-[20px] border border-[#243044] bg-[#1a2332] p-6 text-[#94a3b8]">
          No pending signup requests.
        </p>
      ) : (
        pending.map((user) => (
          <div
            key={user.id}
            className="flex flex-col gap-4 rounded-[20px] border border-[#243044] bg-[#1a2332] p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-[#f0f9ff]">
                {user.display_name ?? user.email}
              </p>
              <p className="text-sm text-[#94a3b8]">{user.email}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-[#64748b]">
                Requested {new Date(user.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => review(user.id, "approve")}
                className="rounded-full bg-[#06b6d4] px-4 py-2 text-sm font-semibold text-black"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => review(user.id, "reject")}
                className="rounded-full border border-[#f87171] px-4 py-2 text-sm text-[#f87171]"
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
      {message ? <p className="text-sm text-[#67e8f9]">{message}</p> : null}
    </div>
  );
}
