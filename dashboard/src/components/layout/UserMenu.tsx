"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type NavProfile = {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
};

type UserMenuProps = {
  profile: NavProfile;
};

function initials(profile: NavProfile): string {
  if (profile.display_name?.trim()) {
    return profile.display_name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return profile.email[0]?.toUpperCase() ?? "?";
}

export function UserMenu({ profile }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-pill border border-surface-raised bg-surface py-1 pl-1 pr-3 transition hover:border-cyan-core"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-muted text-xs font-bold text-cyan-glow">
            {initials(profile)}
          </span>
        )}
        <span className="hidden max-w-[140px] truncate text-xs text-secondary sm:inline">
          {profile.display_name ?? profile.email}
        </span>
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-surface-raised bg-surface py-2 shadow-lg"
          role="menu"
        >
          <div className="border-b border-surface-raised px-4 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {profile.display_name ?? "Member"}
            </p>
            <p className="truncate text-xs text-muted">{profile.email}</p>
          </div>
          <Link
            href="/settings"
            className="block px-4 py-2 text-sm text-secondary hover:bg-surface-raised hover:text-cyan-bright"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Settings & themes
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full px-4 py-2 text-left text-sm text-secondary hover:bg-surface-raised hover:text-error"
              role="menuitem"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
