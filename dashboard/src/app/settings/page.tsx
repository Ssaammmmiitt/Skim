import { DigestPreferenceForm } from "@/components/DigestPreferenceForm";
import { createClient } from "@/lib/supabase/server";
import type { DigestPreferences } from "@/lib/auth/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: preferences } = await supabase
    .from("user_digest_preferences")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .maybeSingle<DigestPreferences>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-[#22d3ee]">Settings</p>
      <h1 className="mt-2 text-3xl font-bold text-[#f0f9ff]">Digest preferences</h1>
      <p className="mt-2 text-[#94a3b8]">
        Choose how your daily email looks and what it includes. Changes apply to the next digest.
      </p>
      <DigestPreferenceForm
        initial={{
          theme: preferences?.theme ?? "cyan",
          format: preferences?.format ?? "full",
          max_stories: preferences?.max_stories ?? 8,
          topic_filters: preferences?.topic_filters ?? [],
          email_enabled: preferences?.email_enabled ?? true,
        }}
      />
    </div>
  );
}
