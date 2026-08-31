import { topicClass, topicLabel } from "@/lib/topics";
import { cn } from "@/lib/cn";

type TopicBadgeProps = {
  topic: string | null;
  className?: string;
};

export function TopicBadge({ topic, className }: TopicBadgeProps) {
  return (
    <span className={cn("skim-pill", topicClass(topic), className)}>
      {topicLabel(topic)}
    </span>
  );
}
