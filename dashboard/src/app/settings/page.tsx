import { DigestPreferenceForm } from "@/components/settings/DigestPreferenceForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/server";
import type { DigestPreferences } from "@/lib/auth/types";
import { normalizeDashboardTheme } from "@/lib/dashboard-theme";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: preferences } = await supabase
    .from("user_digest_preferences")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .maybeSingle<DigestPreferences>();

  return (
    <PageContainer size="lg">
      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        description="Customize your dashboard appearance and daily digest email — theme, format, topics, and delivery."
      />
      <DigestPreferenceForm
        initial={{
          theme: preferences?.theme ?? "cyan",
          format: preferences?.format ?? "full",
          max_stories: preferences?.max_stories ?? 8,
          topic_filters: preferences?.topic_filters ?? [],
          email_enabled: preferences?.email_enabled ?? true,
          dashboard_theme: normalizeDashboardTheme(
            preferences?.dashboard_theme ?? "dark"
          ),
        }}
      />
    </PageContainer>
  );
}
