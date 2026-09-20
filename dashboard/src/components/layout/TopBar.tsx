"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { SearchBar } from "@/components/ui/SearchBar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu, type NavProfile } from "@/components/layout/UserMenu";
import { BrandMark } from "@/components/layout/BrandMark";
import { cn } from "@/lib/cn";

type TopBarProps = {
  profile: NavProfile | null;
  pendingApprovalCount?: number;
  scrolled?: boolean;
};

export function TopBar({ profile, scrolled = false }: TopBarProps) {
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-surface-raised bg-canvas/95 px-6 backdrop-blur-sm transition-shadow md:px-12",
        scrolled && "shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
      )}
    >
      {isOnboarding ? (
        <div className="flex items-center gap-2 text-xs font-normal text-on-canvas">
          <span className="flex h-6 items-center gap-1.5 rounded-full border border-hairline-soft bg-surface px-3 py-0.5">
            <Sparkles size={12} />
            <span>Setup: Personalize Your Digest</span>
          </span>
        </div>
      ) : (
        <>
          {/* Mobile brand mark (< lg) */}
          <Link href="/" className="lg:hidden flex items-center shrink-0 mr-1" aria-label="Skim Home">
            <BrandMark size="sm" />
          </Link>

          {/* Search bar — desktop */}
          <div className="flex-1 max-w-sm hidden md:block">
            <SearchBar variant="nav" />
          </div>

          {/* Mobile search icon — links to /search */}
          <Link
            href="/search"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline-soft/40 text-secondary transition hover:border-hairline hover:text-on-canvas md:hidden"
            aria-label="Search"
          >
            <Search size={16} aria-hidden />
          </Link>
        </>
      )}

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        {profile ? <UserMenu profile={profile} /> : null}
      </div>
    </header>
  );
}
