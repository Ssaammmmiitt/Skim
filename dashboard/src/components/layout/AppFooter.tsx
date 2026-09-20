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
    <footer className="mt-auto border-t border-surface-raised bg-canvas">
      {/* Main footer row */}
      <div className="mx-auto max-w-[1440px] px-6 py-12 md:px-12 md:py-16 lg:px-24">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <BrandMark />
            <p className="max-w-[22rem] text-xs font-normal leading-relaxed text-muted">
              Your daily agentic tech digest — curated by AI, delivered sharp.
            </p>
          </div>

          {/* Nav links */}
          <nav
            className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-normal text-secondary"
            aria-label="Footer navigation"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-on-canvas"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-surface-raised">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-6 md:px-12 lg:px-24">
          <p className="text-xs font-normal text-muted">
            © {CURRENT_YEAR} Skim. All rights reserved.
          </p>
          <nav
            className="flex items-center gap-6 text-xs font-normal text-muted"
            aria-label="Legal links"
          >
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-on-canvas"
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
