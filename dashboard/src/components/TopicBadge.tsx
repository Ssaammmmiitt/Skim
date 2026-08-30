import { topicColors, topicLabel } from "@/lib/topics";

type TopicBadgeProps = {
  topic: string | null;
};

export function TopicBadge({ topic }: TopicBadgeProps) {
  const colors = topicColors(topic);
  const label = topicLabel(topic);

  return (
    <span
      className="inline-block rounded-2xl px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}
