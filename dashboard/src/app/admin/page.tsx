import { AdminPanel } from "@/components/admin/AdminPanel";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/types";
import type { Profile } from "@/lib/auth/types";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .maybeSingle<Profile>();

  if (!isAdmin(profile)) redirect("/");

  const admin = createAdminClient();
  const { data: pendingUsers } = await admin
    .from("profiles")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="Signup approvals"
        description="Review new users before they can access Skim. Approved users are added to digest delivery automatically."
      />
      <AdminPanel initialPending={(pendingUsers ?? []) as Profile[]} />
    </PageContainer>
  );
}
