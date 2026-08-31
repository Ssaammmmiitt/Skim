import type { DashboardTheme, DigestFormat, DigestTheme } from "@/lib/auth/types";
import { normalizeDashboardTheme } from "@/lib/dashboard-theme";

const DIGEST_THEMES = new Set<DigestTheme>(["cyan", "classic", "minimal"]);
const DIGEST_FORMATS = new Set<DigestFormat>(["full", "brief", "headlines"]);

export type PreferencesInput = {
  theme?: unknown;
  format?: unknown;
  max_stories?: unknown;
  topic_filters?: unknown;
  email_enabled?: unknown;
  dashboard_theme?: unknown;
};

export type ValidatedPreferences = {
  theme: DigestTheme;
  format: DigestFormat;
  max_stories: number;
  topic_filters: string[] | null;
  email_enabled: boolean;
  dashboard_theme: DashboardTheme;
};

export function validatePreferences(body: PreferencesInput): ValidatedPreferences {
  const theme = DIGEST_THEMES.has(body.theme as DigestTheme)
    ? (body.theme as DigestTheme)
    : "cyan";

  const format = DIGEST_FORMATS.has(body.format as DigestFormat)
    ? (body.format as DigestFormat)
    : "full";

  const maxRaw = Number(body.max_stories);
  const max_stories = Number.isFinite(maxRaw)
    ? Math.min(12, Math.max(3, Math.round(maxRaw)))
    : 8;

  let topic_filters: string[] | null = null;
  if (Array.isArray(body.topic_filters)) {
    const filtered = body.topic_filters.filter(
      (item): item is string => typeof item === "string" && item.length > 0
    );
    topic_filters = filtered.length > 0 ? filtered : null;
  }

  const email_enabled =
    typeof body.email_enabled === "boolean" ? body.email_enabled : true;

  const dashboard_theme = normalizeDashboardTheme(body.dashboard_theme);

  return {
    theme,
    format,
    max_stories,
    topic_filters,
    email_enabled,
    dashboard_theme,
  };
}
