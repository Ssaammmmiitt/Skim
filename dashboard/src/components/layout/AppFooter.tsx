import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-on-dark/10 bg-ink px-4 py-10 text-on-dark sm:px-8 md:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <BrandMark inverted />
        <nav
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-on-dark/80"
          aria-label="Footer"
        >
          <Link href="/" className="hover:text-on-dark">
            Today
          </Link>
          <Link href="/archive" className="hover:text-on-dark">
            Archive
          </Link>
          <Link href="/chat" className="hover:text-on-dark">
            Chat
          </Link>
          <Link href="/settings" className="hover:text-on-dark">
            Settings
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-7xl text-xs uppercase tracking-eyebrow text-on-dark/50">
        Daily tech digest · Agentic pipeline
      </p>
    </footer>
  );
}
