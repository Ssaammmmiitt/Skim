import type {
  DigestFormat,
  DigestFontStyle,
  DigestSummaryStyle,
  DigestTheme,
} from "@/lib/auth/types";

// ── Theme labels ──────────────────────────────────────────────────────────────

export const DIGEST_THEMES: Record<DigestTheme, string> = {
  cyan: "Skim Dark  -  cyan on near-black",
  classic: "Classic Light  -  white card layout",
  minimal: "Minimal  -  serif, text-first",
  rose: "Rose  -  warm rose on deep black",
  amber: "Amber  -  gold accents on dark slate",
  violet: "Violet  -  lavender on deep indigo",
  slate: "Slate  -  monochrome, ultra-clean",
};

// ── Format labels ─────────────────────────────────────────────────────────────

export const DIGEST_FORMATS: Record<DigestFormat, string> = {
  full: "Full  -  insights, takeaways, summaries",
  brief: "Brief  -  headlines and takeaways",
  headlines: "Headlines  -  titles and links only",
};

// ── Email theme visual metadata ───────────────────────────────────────────────

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
  swatches: string[];
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
    swatches: ["#0f1419", "#1a2332", "#06b6d4", "#f0f9ff"],
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
    swatches: ["#f4f4f5", "#ffffff", "#2563eb", "#18181b"],
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
    swatches: ["#fafafa", "#ffffff", "#52525b", "#18181b"],
    traits: ["Serif headlines", "Minimal chrome", "Reading focused"],
  },
  rose: {
    label: "Rose",
    description: "Warm rose & pink accents on deep black",
    preview: {
      pageBg: "#0c0a0b",
      cardBg: "#1a1015",
      headerBg: "#0c0a0b",
      accent: "#f43f5e",
      text: "#fff1f2",
      meta: "#fda4af",
    },
    swatches: ["#0c0a0b", "#1a1015", "#f43f5e", "#fff1f2"],
    traits: ["Rose accents", "Deep black canvas", "Bold headlines"],
  },
  amber: {
    label: "Amber",
    description: "Warm gold accents on a dark slate background",
    preview: {
      pageBg: "#0f0e09",
      cardBg: "#1c1a10",
      headerBg: "#0f0e09",
      accent: "#f59e0b",
      text: "#fffbeb",
      meta: "#fcd34d",
    },
    swatches: ["#0f0e09", "#1c1a10", "#f59e0b", "#fffbeb"],
    traits: ["Gold accents", "Dark amber canvas", "Warm & readable"],
  },
  violet: {
    label: "Violet",
    description: "Lavender accents on deep indigo-black",
    preview: {
      pageBg: "#0b0a14",
      cardBg: "#14112a",
      headerBg: "#0b0a14",
      accent: "#8b5cf6",
      text: "#f5f3ff",
      meta: "#c4b5fd",
    },
    swatches: ["#0b0a14", "#14112a", "#8b5cf6", "#f5f3ff"],
    traits: ["Violet accents", "Deep indigo canvas", "Premium feel"],
  },
  slate: {
    label: "Slate",
    description: "Monochrome slate — ultra-clean, near zero colour",
    preview: {
      pageBg: "#0f172a",
      cardBg: "#1e293b",
      headerBg: "#0f172a",
      accent: "#94a3b8",
      text: "#f8fafc",
      meta: "#64748b",
    },
    swatches: ["#0f172a", "#1e293b", "#94a3b8", "#f8fafc"],
    traits: ["Monochrome", "Ultra-minimal", "Focus on content"],
  },
};

// ── Font style metadata ───────────────────────────────────────────────────────

export type FontStyleMeta = {
  label: string;
  description: string;
  fontFamily: string;
  sampleHeadline: string;
};

export const DIGEST_FONT_STYLES: Record<DigestFontStyle, FontStyleMeta> = {
  sans: {
    label: "Sans-serif",
    description: "Clean & modern — great for scanning",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    sampleHeadline: "The future of AI is agentic",
  },
  serif: {
    label: "Serif",
    description: "Editorial & newspaper feel",
    fontFamily: "Georgia, 'Times New Roman', Times, serif",
    sampleHeadline: "The future of AI is agentic",
  },
  mono: {
    label: "Monospace",
    description: "Technical & minimal — hacker aesthetic",
    fontFamily: "'Courier New', Courier, monospace",
    sampleHeadline: "The future of AI is agentic",
  },
};

// ── Summary style metadata ────────────────────────────────────────────────────

export type SummaryStyleMeta = {
  label: string;
  description: string;
  mockLines: string[];
  icon: string;
};

export const DIGEST_SUMMARY_STYLES: Record<DigestSummaryStyle, SummaryStyleMeta> = {
  prose: {
    label: "Prose",
    description: "Flowing paragraph — full context and nuance",
    mockLines: [
      "OpenAI's latest model brings significant improvements to reasoning and coding tasks, with enterprise pricing that undercuts GPT-4 by 40%.",
    ],
    icon: "¶",
  },
  bullet_points: {
    label: "Bullet Points",
    description: "3 key points per story — fast and scannable",
    mockLines: [
      "• Reasoning improved 40% over previous model",
      "• Enterprise pricing cut by 40% vs GPT-4",
      "• Available via API starting today",
    ],
    icon: "•",
  },
  card: {
    label: "Card",
    description: "Compact info-card with labelled fields",
    mockLines: ["📌 Key takeaway", "💡 Insight", "🔗 Read more"],
    icon: "▤",
  },
};

// ── Format flags ──────────────────────────────────────────────────────────────

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

// ── Topic options ─────────────────────────────────────────────────────────────

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

// ── Sample story for previews ─────────────────────────────────────────────────

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
