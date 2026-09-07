import { StatsCharts } from "@/components/admin/stats/StatsCharts";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, type Profile } from "@/lib/auth/types";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Analytics | Skim Admin",
};

export default async function StatsPage() {
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
        eyebrow="Analytics"
        title="Skim Analytics"
        description="Pipeline performance and article classification metrics."
      />
      
      <main>
        <StatsCharts />
      </main>
    </PageContainer>
  );
}
