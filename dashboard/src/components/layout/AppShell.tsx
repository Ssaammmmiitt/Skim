import { createClient } from "@/lib/supabase/server";
import type { DashboardTheme, Profile } from "@/lib/auth/types";
import { normalizeDashboardTheme } from "@/lib/dashboard-theme";
import { AppShellClient } from "./AppShellClient";
import type { NavProfile } from "./UserMenu";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: NavProfile | null = null;
  let dashboardTheme: DashboardTheme = "light";

  if (user) {
    const [profileResult, prefsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("email, display_name, avatar_url, role, status")
        .eq("id", user.id)
        .maybeSingle<
          Pick<Profile, "email" | "display_name" | "avatar_url" | "role" | "status">
        >(),
      supabase
        .from("user_digest_preferences")
        .select("dashboard_theme")
        .eq("user_id", user.id)
        .maybeSingle<{ dashboard_theme: string | null }>(),
    ]);

    if (profileResult.data) {
      profile = profileResult.data;
    }
    dashboardTheme = normalizeDashboardTheme(
      prefsResult.data?.dashboard_theme ?? "dark"
    );
  }

  return (
    <AppShellClient profile={profile} dashboardTheme={dashboardTheme}>
      {children}
    </AppShellClient>
  );
}
