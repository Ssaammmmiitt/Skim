import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, type Profile } from "@/lib/auth/types";

export async function AppNav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, email")
    .eq("id", user?.id ?? "")
    .maybeSingle<Pick<Profile, "role" | "status" | "email">>();

  const linkClass =
    "text-sm text-[#94a3b8] transition hover:text-[#22d3ee]";

  return (
    <header className="border-b border-[#1a2332] bg-[#0f1419]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-[#f0f9ff]">
          Skim
        </Link>
        <nav className="flex items-center gap-5">
          <Link href="/" className={linkClass}>
            Today
          </Link>
          <Link href="/archive" className={linkClass}>
            Archive
          </Link>
          <Link href="/chat" className={linkClass}>
            Chat
          </Link>
          <Link href="/settings" className={linkClass}>
            Settings
          </Link>
          {isAdmin(profile as Profile) ? (
            <Link
              href="/admin"
              className="rounded-full border border-[#06b6d4] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#22d3ee]"
            >
              Admin
            </Link>
          ) : null}
          <span className="hidden text-xs text-[#64748b] sm:inline">
            {profile?.email}
          </span>
        </nav>
      </div>
    </header>
  );
}
