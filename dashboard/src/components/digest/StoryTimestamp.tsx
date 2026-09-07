import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type StoryTimestampProps = {
  /** ISO string or human-readable time string */
  value: string | null;
  className?: string;
};

/**
 * Formats a time string for the StoryStream timeline rail.
 * Renders mono-uppercase timestamp on the left of the dashed rail.
 */
export function StoryTimestamp({ value, className }: StoryTimestampProps) {
  if (!value) return null;

  // If it's an ISO string, parse to short time
  let display = value;
  if (value.includes("T") || value.includes(":")) {
    try {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        display = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      // fall through to raw value
    }
  }

  return (
    <time
      dateTime={value}
      className={cn(ui.timelineTimestamp, "block", className)}
    >
      {display}
    </time>
  );
}
