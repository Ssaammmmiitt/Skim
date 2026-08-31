import { topicClass, topicLabel } from "@/lib/topics";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type TopicBadgeProps = {
  topic: string | null;
  className?: string;
};

export function TopicBadge({ topic, className }: TopicBadgeProps) {
  return (
    <span className={cn(ui.pill, topicClass(topic), className)}>
      {topicLabel(topic)}
    </span>
  );
}
