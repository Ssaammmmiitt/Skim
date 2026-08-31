export type UserRole = "superuser" | "admin" | "member";
export type UserStatus = "pending" | "active" | "rejected" | "suspended";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  approved_at: string | null;
};

export type DigestTheme = "cyan" | "classic" | "minimal";
export type DigestFormat = "full" | "brief" | "headlines";
export type DashboardTheme = "light" | "dark" | "system";

export type DigestPreferences = {
  user_id: string;
  theme: DigestTheme;
  format: DigestFormat;
  max_stories: number;
  topic_filters: string[] | null;
  email_enabled: boolean;
  dashboard_theme: DashboardTheme;
  updated_at: string;
};

export function isAdmin(profile: Profile | null): boolean {
  return profile?.status === "active" && ["superuser", "admin"].includes(profile.role);
}

export function isSuperuser(profile: Profile | null): boolean {
  return profile?.status === "active" && profile.role === "superuser";
}
