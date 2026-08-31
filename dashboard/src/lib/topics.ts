import { TOPIC_OPTIONS } from "@/lib/digest-preferences";

const TOPIC_LABELS = Object.fromEntries(
  TOPIC_OPTIONS.map((topic) => [topic.id, topic.label])
) as Record<string, string>;

/** Vodafone badge-chip — single accent palette for all topics */
export const BADGE_CHIP_CLASS = "bg-canvas-soft text-ink";

export function topicLabel(topic: string | null): string {
  if (!topic) return "Other";
  return TOPIC_LABELS[topic] ?? topic.replace(/_/g, " ");
}

export function topicClass(_topic: string | null): string {
  return BADGE_CHIP_CLASS;
}

/** @deprecated Use topicClass() */
export function topicColors(topic: string | null) {
  return { bg: "", text: "", className: topicClass(topic) };
}
