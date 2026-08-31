"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import { BrandMark } from "@/components/layout/BrandMark";
import { SearchBar } from "@/components/ui/SearchBar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { isAdmin, type Profile } from "@/lib/auth/types";
import { cn } from "@/lib/cn";
import { isNavActive, MAIN_NAV_ITEMS } from "@/lib/nav";
import * as ui from "@/lib/tailwind-ui";
import { useUiStore } from "@/store/ui-store";
import { UserMenu, type NavProfile } from "./UserMenu";

type AppNavProps = {
  profile: NavProfile | null;
  pendingApprovalCount?: number;
};

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

export function AppNav({ profile, pendingApprovalCount = 0 }: AppNavProps) {
  const pathname = usePathname();
  const mobileOpen = useUiStore((state) => state.mobileNavOpen);
  const scrolled = useUiStore((state) => state.navScrolled);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const setNavScrolled = useUiStore((state) => state.setNavScrolled);
  const closeMobileNav = useUiStore((state) => state.closeMobileNav);

  useBodyScrollLock(mobileOpen);

  useEffect(() => {
    closeMobileNav();
  }, [pathname, closeMobileNav]);

  useEffect(() => {
    function onScroll() {
      setNavScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [setNavScrolled]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMobileNav();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobileNav]);

  const closeMobile = useCallback(() => closeMobileNav(), [closeMobileNav]);

  function linkClass(href: string): string {
    return cn(
      ui.navLink,
      isNavActive(pathname, href) ? ui.navLinkActive : ui.navLinkInactive
    );
  }

  const showAdmin = profile && isAdmin(profile as Profile);
  const pendingBadge =
    pendingApprovalCount > 0 ? (
      <span
        className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white"
        aria-label={`${pendingApprovalCount} pending approvals`}
      >
        {pendingApprovalCount > 9 ? "9+" : pendingApprovalCount}
      </span>
    ) : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-surface-raised bg-canvas/95 text-foreground backdrop-blur-sm transition-shadow",
        scrolled && "shadow-md shadow-black/10"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 2xl:px-8">
        <div className="flex h-14 items-center gap-2 sm:h-16 sm:gap-3">
          <Link
            href="/"
            className="shrink-0"
            onClick={closeMobile}
          >
            <BrandMark />
          </Link>

          <nav
            className="hidden min-w-0 flex-1 items-center justify-center lg:flex"
            aria-label="Main navigation"
          >
            <div className={cn(ui.navScroll, "max-w-full px-1")}>
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
            </div>
          </nav>

          <div className="hidden min-w-0 flex-1 md:block md:max-w-xs lg:max-w-none lg:flex-none xl:max-w-sm">
            <SearchBar variant="nav" />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/search"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-surface-raised text-lg text-secondary transition hover:border-cyan-core hover:text-cyan-bright md:hidden"
              aria-label="Search articles"
            >
              ⌕
            </Link>

            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {showAdmin ? (
              <Link
                href="/admin"
                className={cn(
                  "hidden rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide sm:inline-flex sm:items-center",
                  isNavActive(pathname, "/admin")
                    ? "border-cyan-core bg-cyan-muted text-cyan-glow"
                    : "border-surface-raised text-cyan-bright hover:border-cyan-core"
                )}
              >
                Admin
                {pendingBadge}
              </Link>
            ) : null}

            {profile ? <UserMenu profile={profile} /> : null}

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-surface-raised text-secondary hover:border-cyan-core hover:text-cyan-bright lg:hidden"
              onClick={() => setMobileNavOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        <nav
          className="hidden border-t border-surface-raised py-2 md:block lg:hidden"
          aria-label="Tablet navigation"
        >
          <div className={ui.navScroll}>
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
          </div>
        </nav>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div
            id="mobile-nav-drawer"
            className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,18rem)] flex-col border-l border-surface-raised bg-surface shadow-xl sm:w-80 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between border-b border-surface-raised px-4 py-3">
              <BrandMark />
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-raised text-secondary"
                onClick={closeMobile}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4 sm:hidden">
                <ThemeToggle />
              </div>
              <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
                {MAIN_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-xl px-3 py-3 transition",
                      isNavActive(pathname, item.href)
                        ? "bg-cyan-muted text-cyan-glow"
                        : "text-secondary hover:bg-surface-raised hover:text-foreground"
                    )}
                    aria-current={
                      isNavActive(pathname, item.href) ? "page" : undefined
                    }
                    onClick={closeMobile}
                  >
                    <span className="block text-sm font-semibold">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {item.description}
                    </span>
                  </Link>
                ))}
                {showAdmin ? (
                  <Link
                    href="/admin"
                    className={cn(
                      "rounded-xl px-3 py-3 transition",
                      isNavActive(pathname, "/admin")
                        ? "bg-cyan-muted text-cyan-glow"
                        : "text-secondary hover:bg-surface-raised hover:text-foreground"
                    )}
                    aria-current={
                      isNavActive(pathname, "/admin") ? "page" : undefined
                    }
                    onClick={closeMobile}
                  >
                    <span className="flex items-center text-sm font-semibold">
                      Admin
                      {pendingBadge}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Approve pending signups
                    </span>
                  </Link>
                ) : null}
              </nav>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
