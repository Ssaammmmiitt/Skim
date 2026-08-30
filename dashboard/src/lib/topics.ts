import { TOPIC_OPTIONS } from "@/lib/digest-preferences";

const TOPIC_LABELS = Object.fromEntries(
  TOPIC_OPTIONS.map((topic) => [topic.id, topic.label])
) as Record<string, string>;

/** Topic badge colors per Design.md — cyan/teal/slate family */
const TOPIC_COLORS: Record<string, { bg: string; text: string }> = {
  ai_ml: { bg: "#164e63", text: "#67e8f9" },
  web_dev: { bg: "#134e4a", text: "#5eead4" },
  cloud_infra: { bg: "#1e3a5f", text: "#7dd3fc" },
  cybersecurity: { bg: "#450a0a", text: "#fca5a5" },
  startups: { bg: "#422006", text: "#fcd34d" },
  programming: { bg: "#1e293b", text: "#94a3b8" },
  science: { bg: "#312e81", text: "#c4b5fd" },
  other: { bg: "#243044", text: "#94a3b8" },
};

const DEFAULT_COLORS = { bg: "#243044", text: "#94a3b8" };

export function topicLabel(topic: string | null): string {
  if (!topic) return "Other";
  return TOPIC_LABELS[topic] ?? topic.replace(/_/g, " ");
}

export function topicColors(topic: string | null) {
  return TOPIC_COLORS[topic ?? "other"] ?? DEFAULT_COLORS;
}
