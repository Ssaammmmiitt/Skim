import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";

const CURRENT_YEAR = new Date().getFullYear();

const NAV_LINKS = [
  { href: "/", label: "Today" },
  { href: "/archive", label: "Archive" },
  { href: "/chat", label: "Chat" },
  { href: "/settings", label: "Settings" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  {
    href: "https://github.com",
    label: "GitHub",
    external: true,
  },
];

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-cyan-deep/20 bg-surface">
      {/* Main footer row */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <BrandMark />
            <p className="max-w-[22rem] text-xs leading-relaxed text-secondary">
              Your daily agentic tech digest — curated by AI, delivered sharp.
            </p>
          </div>

          {/* Nav links */}
          <nav
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-secondary"
            aria-label="Footer navigation"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-cyan-bright"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-surface-raised">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8">
          <p className="text-xs text-muted">
            © {CURRENT_YEAR} Skim. All rights reserved.
          </p>
          <nav
            className="flex items-center gap-4 text-xs text-secondary"
            aria-label="Legal links"
          >
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-cyan-bright"
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
