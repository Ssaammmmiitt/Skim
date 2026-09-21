"use client";

import { useState } from "react";
import { User, Mail, Calendar, Check, Edit2 } from "lucide-react";
import type { Profile } from "@/lib/auth/types";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type ProfileCardProps = {
  profile: Profile;
};

export function ProfileCard({ profile }: ProfileCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

  const joinDate = new Date(profile.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-start sm:p-8">
      {/* Avatar */}
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-2xl font-normal text-foreground sm:h-24 sm:w-24 sm:text-3xl">
        {profile.avatar_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="h-full w-full rounded-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          (profile.display_name ?? profile.email)[0].toUpperCase()
        )}
      </div>

      {/* Details */}
      <div className="flex-1 space-y-4">
        {editing ? (
          <form onSubmit={handleSave} className="flex max-w-sm items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={ui.input}
              placeholder="Display Name"
              autoFocus
            />
            <button
              type="submit"
              disabled={saving}
              className={cn(ui.btnPrimary, "h-10 w-10 min-h-0 p-0")}
            >
              <Check size={18} />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-normal tracking-normal text-foreground sm:text-2xl">
              {profile.display_name ?? "Member"}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-secondary transition hover:text-foreground"
            >
              <Edit2 size={16} />
            </button>
          </div>
        )}

        <div className="space-y-2 text-sm font-normal text-secondary">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-muted" />
            <span>{profile.email}</span>
            <span className="rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-xs font-normal text-secondary">
              {profile.role}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted" />
            <span>Joined {joinDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
