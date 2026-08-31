"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { isAdmin, type Profile } from "@/lib/auth/types";
import { cn } from "@/lib/cn";
import { isNavActive, MAIN_NAV_ITEMS } from "@/lib/nav";
import type { NavProfile } from "./UserMenu";
import { UserMenu } from "./UserMenu";

type AppNavProps = {
  profile: NavProfile | null;
};

export function AppNav({ profile }: AppNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function linkClass(href: string): string {
    return cn(
      "skim-nav-link",
      isNavActive(pathname, href)
        ? "skim-nav-link-active"
        : "skim-nav-link-inactive"
    );
  }

  return (
    <header className="skim-shell-header">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-foreground"
        >
          Skim
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Main navigation"
        >
          {MAIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href)}
              aria-current={isNavActive(pathname, item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden min-w-0 flex-1 md:block md:max-w-xs lg:max-w-sm">
          <SearchBar variant="nav" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {profile && isAdmin(profile as Profile) ? (
            <Link
              href="/admin"
              className={cn(
                "hidden rounded-pill border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide sm:inline",
                isNavActive(pathname, "/admin")
                  ? "border-cyan-glow bg-cyan-muted text-cyan-glow"
                  : "border-cyan-core text-cyan-bright hover:bg-cyan-muted"
              )}
            >
              Admin
            </Link>
          ) : null}

          {profile ? <UserMenu profile={profile} /> : null}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-pill border border-surface-raised text-secondary hover:border-cyan-core hover:text-cyan-bright lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          id="mobile-nav"
          className="border-t border-surface px-4 py-4 lg:hidden"
        >
          <div className="mb-4 md:hidden">
            <SearchBar variant="nav" />
          </div>
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {MAIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(item.href)}
                aria-current={
                  isNavActive(pathname, item.href) ? "page" : undefined
                }
              >
                {item.label}
              </Link>
            ))}
            {profile && isAdmin(profile as Profile) ? (
              <Link href="/admin" className={linkClass("/admin")}>
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
