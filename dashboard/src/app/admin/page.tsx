import { AdminPanel } from "@/components/admin/AdminPanel";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
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
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="Signup approvals"
        description="Review new users before they can access Skim. Approved users are added to digest delivery automatically."
      />
      <AdminPanel />
    </PageContainer>
  );
}
