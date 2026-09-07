import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import * as ui from "@/lib/tailwind-ui";

const NAV_LINKS = [
  { href: "/", label: "Today's digest" },
  { href: "/archive", label: "Archive" },
  { href: "/search", label: "Search" },
];

export default function NotFound() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-lg py-8 text-center sm:py-16">
        {/* Large cyan 404 */}
        <p
          className="select-none text-8xl font-black leading-none tracking-tight text-cyan-core opacity-20 sm:text-9xl"
          aria-hidden="true"
        >
          404
        </p>

        {/* Content */}
        <p className={`${ui.eyebrow} mt-4`}>Not found</p>
        <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
          This page doesn&apos;t exist
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-secondary">
          The URL you followed doesn&apos;t match any page in Skim. Check the
          address or navigate back to today&apos;s briefing.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={ui.btnPrimary}>
            Go home
          </Link>
          <Link href="/archive" className={ui.btnGhost}>
            Browse archive
          </Link>
        </div>

        {/* Helpful nav */}
        <div className="mt-10 border-t border-surface-raised pt-8">
          <p className={`${ui.meta} mb-4`}>You might be looking for</p>
          <nav
            className="flex flex-wrap justify-center gap-3"
            aria-label="Not found suggestions"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={ui.btnSecondary}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </PageContainer>
  );
}
