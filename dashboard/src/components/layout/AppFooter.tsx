import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-surface-raised bg-surface px-4 py-8 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <BrandMark />
        <nav
          className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-secondary"
          aria-label="Footer"
        >
          <Link href="/" className="hover:text-cyan-bright">
            Today
          </Link>
          <Link href="/archive" className="hover:text-cyan-bright">
            Archive
          </Link>
          <Link href="/chat" className="hover:text-cyan-bright">
            Chat
          </Link>
          <Link href="/settings" className="hover:text-cyan-bright">
            Settings
          </Link>
        </nav>
      </div>
    </footer>
  );
}
