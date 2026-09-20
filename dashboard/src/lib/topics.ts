import { TOPIC_OPTIONS } from "@/lib/digest-preferences";

const TOPIC_LABELS = Object.fromEntries(
  TOPIC_OPTIONS.map((topic) => [topic.id, topic.label])
) as Record<string, string>;

const TOPIC_CLASSES: Record<string, string> = {
  ai_ml: "border border-border-on-dark/30 bg-surface text-on-canvas",
  web_dev: "border border-border-on-dark/30 bg-surface text-on-canvas",
  cloud_infra: "border border-border-on-dark/30 bg-surface text-on-canvas",
  cybersecurity: "border border-border-on-dark/30 bg-surface text-on-canvas",
  startups: "border border-border-on-dark/30 bg-surface text-on-canvas",
  programming: "border border-border-on-dark/30 bg-surface text-on-canvas",
  science: "border border-border-on-dark/30 bg-surface text-on-canvas",
  other: "border border-hairline-soft/40 bg-surface text-muted",
};

const DEFAULT_TOPIC_CLASS = "border border-border-on-dark/30 bg-surface text-on-canvas";

export function topicLabel(topic: string | null): string {
  if (!topic) return "Other";
  return TOPIC_LABELS[topic] ?? topic.replace(/_/g, " ");
}

export function topicClass(topic: string | null): string {
  return TOPIC_CLASSES[topic ?? "other"] ?? DEFAULT_TOPIC_CLASS;
}

export function topicColors(topic: string | null) {
  return { bg: "", text: "", className: topicClass(topic) };
}
