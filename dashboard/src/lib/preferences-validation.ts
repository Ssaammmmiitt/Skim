import type {
  DashboardTheme,
  DigestFormat,
  DigestFontStyle,
  DigestSummaryStyle,
  DigestTheme,
} from "@/lib/auth/types";
import { normalizeDashboardTheme } from "@/lib/dashboard-theme";

const VALID_DIGEST_THEMES = new Set<DigestTheme>([
  "cyan",
  "classic",
  "minimal",
  "rose",
  "amber",
  "violet",
  "slate",
]);
const VALID_DIGEST_FORMATS = new Set<DigestFormat>(["full", "brief", "headlines"]);
const VALID_FONT_STYLES = new Set<DigestFontStyle>(["sans", "serif", "mono"]);
const VALID_SUMMARY_STYLES = new Set<DigestSummaryStyle>(["prose", "bullet_points", "card"]);

export type PreferencesInput = {
  theme?: unknown;
  format?: unknown;
  max_stories?: unknown;
  topic_filters?: unknown;
  email_enabled?: unknown;
  dashboard_theme?: unknown;
  font_style?: unknown;
  summary_style?: unknown;
};

export type ValidatedPreferences = {
  theme: DigestTheme;
  format: DigestFormat;
  max_stories: number;
  topic_filters: string[] | null;
  email_enabled: boolean;
  dashboard_theme: DashboardTheme;
  font_style: DigestFontStyle;
  summary_style: DigestSummaryStyle;
};

export function validatePreferences(body: PreferencesInput): ValidatedPreferences {
  const theme = VALID_DIGEST_THEMES.has(body.theme as DigestTheme)
    ? (body.theme as DigestTheme)
    : "cyan";

  const format = VALID_DIGEST_FORMATS.has(body.format as DigestFormat)
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

  const font_style = VALID_FONT_STYLES.has(body.font_style as DigestFontStyle)
    ? (body.font_style as DigestFontStyle)
    : "sans";

  const summary_style = VALID_SUMMARY_STYLES.has(body.summary_style as DigestSummaryStyle)
    ? (body.summary_style as DigestSummaryStyle)
    : "prose";

  return {
    theme,
    format,
    max_stories,
    topic_filters,
    email_enabled,
    dashboard_theme,
    font_style,
    summary_style,
  };
}
