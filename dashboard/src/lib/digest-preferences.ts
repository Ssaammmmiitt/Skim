import type { DigestFormat, DigestTheme } from "@/lib/auth/types";

export const DIGEST_THEMES: Record<DigestTheme, string> = {
  cyan: "Skim Dark  -  cyan on near-black",
  classic: "Classic Light  -  white card layout",
  minimal: "Minimal  -  serif, text-first",
};

export const DIGEST_FORMATS: Record<DigestFormat, string> = {
  full: "Full  -  insights, takeaways, summaries",
  brief: "Brief  -  headlines and takeaways",
  headlines: "Headlines  -  titles and links only",
};

export type EmailThemeMeta = {
  label: string;
  description: string;
  preview: {
    pageBg: string;
    cardBg: string;
    headerBg: string;
    accent: string;
    text: string;
    meta: string;
  };
  traits: string[];
};

export const EMAIL_THEME_META: Record<DigestTheme, EmailThemeMeta> = {
  cyan: {
    label: "Skim Dark",
    description: "Brand default  -  cyan accents on a dark canvas",
    preview: {
      pageBg: "#0f1419",
      cardBg: "#1a2332",
      headerBg: "#0f1419",
      accent: "#06b6d4",
      text: "#f0f9ff",
      meta: "#94a3b8",
    },
    traits: ["Cyan accents", "Dark canvas", "StoryStream cards"],
  },
  classic: {
    label: "Classic Light",
    description: "Clean white card on a soft gray background",
    preview: {
      pageBg: "#f4f4f5",
      cardBg: "#ffffff",
      headerBg: "#ffffff",
      accent: "#2563eb",
      text: "#18181b",
      meta: "#71717a",
    },
    traits: ["White cards", "Blue links", "Email-client friendly"],
  },
  minimal: {
    label: "Minimal",
    description: "Text-first layout with low visual noise",
    preview: {
      pageBg: "#fafafa",
      cardBg: "#ffffff",
      headerBg: "#ffffff",
      accent: "#52525b",
      text: "#18181b",
      meta: "#71717a",
    },
    traits: ["Serif headlines", "Minimal chrome", "Reading focused"],
  },
};

export type FormatFlags = {
  show_takeaways: boolean;
  show_insights: boolean;
  show_summaries: boolean;
  show_read_more: boolean;
  show_rationale: boolean;
  show_stats_footer: boolean;
};

/** Mirrors pipeline/digest_preferences.format_flags */
export function formatFlags(format: DigestFormat): FormatFlags {
  return {
    show_takeaways: format === "full" || format === "brief",
    show_insights: format === "full",
    show_summaries: format === "full",
    show_read_more: format === "full" || format === "brief",
    show_rationale: format === "full",
    show_stats_footer: format === "full",
  };
}

export const FORMAT_INCLUDES: Record<DigestFormat, string[]> = {
  full: [
    "Story headlines",
    "Topic labels",
    "Key takeaways",
    "Editorial insights",
    "Summaries",
    "Read more links",
    "Editor's note & stats footer",
  ],
  brief: ["Story headlines", "Topic labels", "Key takeaways", "Read more links"],
  headlines: ["Story headlines", "Topic labels", "Source links"],
};

export const TOPIC_OPTIONS = [
  { id: "ai_ml", label: "AI / ML" },
  { id: "web_dev", label: "Web Dev" },
  { id: "cloud_infra", label: "Cloud" },
  { id: "cybersecurity", label: "Security" },
  { id: "startups", label: "Startups" },
  { id: "programming", label: "Programming" },
  { id: "science", label: "Science" },
  { id: "other", label: "Other" },
] as const;

export const SAMPLE_PREVIEW_STORY = {
  rank: 1,
  title: "OpenAI ships a new reasoning model",
  topic_label: "AI/ML",
  source: "techcrunch",
  key_takeaway: "Expect cheaper agent workflows at scale.",
  insight: "This shifts how teams budget inference for multi-step agents.",
  summary: "A major model release aimed at developers and enterprises.",
  url: "https://example.com/story",
};
