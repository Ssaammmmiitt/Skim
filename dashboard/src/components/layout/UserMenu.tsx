"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useUnsubscribe } from "@/lib/useUnsubscribe";

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
  const { unsubscribe, loading } = useUnsubscribe();

  const [showConfirm, setShowConfirm] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleUnsubscribeClick = () => {
    setShowConfirm(true);
  };

  const confirmUnsubscribe = async () => {
    await unsubscribe();
    setShowConfirm(false);
    setOpen(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 rounded-full border border-hairline-soft/40 bg-surface py-1 pl-1 pr-3 transition hover:border-hairline"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {profile.avatar_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface-raised text-xs font-mono font-medium text-foreground"
            >
              {initials(profile)}
            </span>
          )}
          <span className="hidden max-w-[120px] truncate text-xs font-normal text-secondary sm:inline md:max-w-[140px]">
            {profile.display_name ?? profile.email}
          </span>
        </button>

        {open ? (
          <div
            className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-hairline bg-surface py-2 shadow-xl shadow-black/20"
            role="menu"
          >
            <div className="border-b border-surface-raised px-4 py-2">
              <p className="truncate text-sm font-normal text-on-canvas">
                {profile.display_name ?? "Member"}
              </p>
              <p className="truncate text-xs font-normal text-muted">{profile.email}</p>
            </div>
            <ThemeToggle variant="menu" />
            <Link
              href="/settings"
              className="block px-4 py-2 text-sm font-normal text-secondary hover:bg-surface-raised hover:text-on-canvas"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              Settings & preferences
            </Link>
            <div className="px-2 py-1">
              <button
                type="button"
                onClick={handleUnsubscribeClick}
                disabled={loading}
                className="flex w-full items-center justify-between rounded-lg bg-error/10 px-3 py-2 text-left text-sm font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-50 dark:bg-error/20 dark:text-error dark:hover:bg-error/30"
                role="menuitem"
              >
                <span>{loading ? "Unsubscribing..." : "Unsubscribe from Digest"}</span>
                <BellOff size={14} className="opacity-80" />
              </button>
            </div>
            <div className="my-1 border-b border-surface-raised" />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full px-4 py-2 text-left text-sm font-normal text-secondary hover:bg-surface-raised hover:text-error"
                role="menuitem"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-2 text-lg font-semibold text-on-canvas">
              Unsubscribe from Digest?
            </h3>
            <p className="mb-6 text-sm text-secondary">
              You will no longer receive daily emails. You can always re-enable this later in your settings.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-medium text-on-canvas transition-colors hover:bg-surface-raised disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUnsubscribe}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-full bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-50"
              >
                {loading ? "Unsubscribing..." : "Yes, Unsubscribe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
