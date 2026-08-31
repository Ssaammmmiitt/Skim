"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BrandMark } from "@/components/layout/BrandMark";
import { SearchBar } from "@/components/ui/SearchBar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { isAdmin, type Profile } from "@/lib/auth/types";
import { cn } from "@/lib/cn";
import { isNavActive, MAIN_NAV_ITEMS } from "@/lib/nav";
import type { NavProfile } from "./UserMenu";
import { UserMenu } from "./UserMenu";

type AppNavProps = {
  profile: NavProfile | null;
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

export function AppNav({ profile }: AppNavProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useBodyScrollLock(mobileOpen);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  function desktopLinkClass(href: string): string {
    return cn(
      "skim-nav-link",
      isNavActive(pathname, href)
        ? "skim-nav-link-active"
        : "skim-nav-link-inactive"
    );
  }

  function mobileLinkClass(href: string): string {
    return cn(
      "skim-nav-link-mobile",
      isNavActive(pathname, href) && "skim-nav-link-mobile-active"
    );
  }

  const showAdmin = profile && isAdmin(profile as Profile);

  return (
    <header
      className={cn(
        "skim-shell-header",
        scrolled && "skim-shell-header-scrolled"
      )}
    >
      {/* Primary bar */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 2xl:px-8">
        <div className="flex h-14 items-center gap-3 sm:h-16 sm:gap-4">
          <Link
            href="/"
            className="shrink-0 transition-opacity hover:opacity-90"
            onClick={closeMobile}
          >
            <BrandMark inverted />
          </Link>

          {/* Desktop nav — visible lg+ */}
          <nav
            className="hidden min-w-0 flex-1 items-center justify-center lg:flex"
            aria-label="Main navigation"
          >
            <div className="skim-nav-scroll max-w-full px-2">
              {MAIN_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={desktopLinkClass(item.href)}
                  aria-current={
                    isNavActive(pathname, item.href) ? "page" : undefined
                  }
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Search — tablet/desktop inline */}
          <div className="hidden w-full min-w-0 max-w-[11rem] sm:max-w-xs md:block lg:max-w-sm xl:max-w-md">
            <SearchBar variant="nav" />
          </div>

          {/* Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/search"
              className="inline-flex h-11 w-11 items-center justify-center rounded-pill-lg border border-on-dark/30 text-lg text-on-dark transition hover:border-primary hover:text-primary md:hidden"
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
                  "hidden rounded-pill-lg border px-3 py-2 text-sm font-semibold sm:inline-flex",
                  isNavActive(pathname, "/admin")
                    ? "border-primary bg-primary text-on-primary"
                    : "border-on-dark/40 text-on-dark hover:border-primary hover:text-primary"
                )}
              >
                Admin
              </Link>
            ) : null}

            {profile ? <UserMenu profile={profile} /> : null}

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-pill-lg border border-on-dark/40 text-on-dark transition hover:border-primary hover:text-primary lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <span className="sr-only">
                {mobileOpen ? "Close menu" : "Open menu"}
              </span>
              <span aria-hidden className="text-lg leading-none">
                {mobileOpen ? "✕" : "☰"}
              </span>
            </button>
          </div>
        </div>

        {/* Tablet nav strip — md to lg */}
        <nav
          className="hidden border-t border-on-dark/15 pb-3 pt-2 md:block lg:hidden"
          aria-label="Tablet navigation"
        >
          <div className="skim-nav-scroll">
            {MAIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={desktopLinkClass(item.href)}
                aria-current={
                  isNavActive(pathname, item.href) ? "page" : undefined
                }
              >
                {item.label}
              </Link>
            ))}
            {showAdmin ? (
              <Link
                href="/admin"
                className={desktopLinkClass("/admin")}
                aria-current={
                  isNavActive(pathname, "/admin") ? "page" : undefined
                }
              >
                Admin
              </Link>
            ) : null}
          </div>
        </nav>

        {/* Home context line — compact on scroll */}
        {isHome ? (
          <p
            className={cn(
              "border-t border-on-dark/10 text-xs text-on-dark/60 transition-all duration-200",
              scrolled
                ? "max-h-0 overflow-hidden border-t-0 py-0 opacity-0"
                : "py-2"
            )}
          >
            Your daily tech briefing — curated stories from the Skim pipeline.
          </p>
        ) : null}
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-[2px] lg:hidden"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div
            id="mobile-nav-drawer"
            className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] flex-col bg-ink shadow-2xl lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between border-b border-on-dark/20 px-4 py-4">
              <BrandMark inverted />
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-pill-lg border border-on-dark/40 text-on-dark"
                onClick={closeMobile}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-4 sm:hidden">
                <ThemeToggle />
              </div>

              <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
                {MAIN_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={mobileLinkClass(item.href)}
                    aria-current={
                      isNavActive(pathname, item.href) ? "page" : undefined
                    }
                    onClick={closeMobile}
                  >
                    <span>
                      <span className="block text-base font-semibold text-on-dark">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-on-dark/60">
                        {item.description}
                      </span>
                    </span>
                    {isNavActive(pathname, item.href) ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : (
                      <span className="text-on-dark/40">→</span>
                    )}
                  </Link>
                ))}

                {showAdmin ? (
                  <Link
                    href="/admin"
                    className={mobileLinkClass("/admin")}
                    onClick={closeMobile}
                  >
                    <span>
                      <span className="block text-base font-semibold text-on-dark">
                        Admin
                      </span>
                      <span className="mt-0.5 block text-xs text-on-dark/60">
                        Approve signups and manage members
                      </span>
                    </span>
                    {isNavActive(pathname, "/admin") ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : (
                      <span className="text-on-dark/40">→</span>
                    )}
                  </Link>
                ) : null}
              </nav>
            </div>

            <div className="border-t border-on-dark/20 p-4">
              <Link
                href="/search"
                className="skim-btn-primary w-full justify-center text-base"
                onClick={closeMobile}
              >
                Search corpus
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
