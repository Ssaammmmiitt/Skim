import { AdminPanel } from "@/components/AdminPanel";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/types";
import type { Profile } from "@/lib/auth/types";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .maybeSingle<Profile>();

  if (!isAdmin(profile)) redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-[#22d3ee]">Admin</p>
      <h1 className="mt-2 text-3xl font-bold text-[#f0f9ff]">Signup approvals</h1>
      <p className="mt-2 text-[#94a3b8]">
        Review new users before they can access Skim. Approved users are added to digest
        delivery automatically.
      </p>
      <AdminPanel />
    </div>
  );
}
