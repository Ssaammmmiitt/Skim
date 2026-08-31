import { TOPIC_OPTIONS } from "@/lib/digest-preferences";

const TOPIC_LABELS = Object.fromEntries(
  TOPIC_OPTIONS.map((topic) => [topic.id, topic.label])
) as Record<string, string>;

const TOPIC_CLASSES: Record<string, string> = {
  ai_ml: "bg-topic-ai text-topic-ai-text",
  web_dev: "bg-topic-web text-topic-web-text",
  cloud_infra: "bg-topic-cloud text-topic-cloud-text",
  cybersecurity: "bg-topic-security text-topic-security-text",
  startups: "bg-topic-startups text-topic-startups-text",
  programming: "bg-topic-code text-topic-code-text",
  science: "bg-topic-science text-topic-science-text",
  other: "bg-surface-raised text-secondary",
};

const DEFAULT_TOPIC_CLASS = "bg-surface-raised text-secondary";

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
