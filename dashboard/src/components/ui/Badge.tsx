import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

/* ─── Status badge ───────────────────────────────────────────────────────── */

export type StatusVariant = "success" | "running" | "partial" | "failed";

type StatusBadgeProps = {
  variant: StatusVariant;
  label?: string;
  /** Show animated pulsing dot (used for "running" state) */
  pulse?: boolean;
};

const STATUS_STYLES: Record<StatusVariant, string> = {
  success: ui.badgeSuccess,
  running: ui.badgeRunning,
  partial: ui.badgePartial,
  failed: ui.badgeFailed,
};

const STATUS_LABELS: Record<StatusVariant, string> = {
  success: "Success",
  running: "Running",
  partial: "Partial",
  failed: "Failed",
};

export function StatusBadge({ variant, label, pulse }: StatusBadgeProps) {
  const showPulse = pulse ?? variant === "running";
  return (
    <span className={STATUS_STYLES[variant]}>
      {showPulse ? (
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-bright opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-bright" />
        </span>
      ) : null}
      {label ?? STATUS_LABELS[variant]}
    </span>
  );
}

/* ─── Topic badge ─────────────────────────────────────────────────────────── */

export type TopicVariant =
  | "ai"
  | "web"
  | "cloud"
  | "security"
  | "startups"
  | "code"
  | "science";

type TopicBadgeProps = {
  topic: string;
  className?: string;
};

const TOPIC_CLASS: Record<string, string> = {
  ai: "bg-topic-ai text-topic-ai-text",
  web: "bg-topic-web text-topic-web-text",
  cloud: "bg-topic-cloud text-topic-cloud-text",
  security: "bg-topic-security text-topic-security-text",
  startups: "bg-topic-startups text-topic-startups-text",
  code: "bg-topic-code text-topic-code-text",
  science: "bg-topic-science text-topic-science-text",
};

export function TopicBadge2({ topic, className }: TopicBadgeProps) {
  const key = topic?.toLowerCase() ?? "";
  return (
    <span
      className={cn(
        ui.badgeTopic,
        TOPIC_CLASS[key] ?? "bg-surface-raised text-secondary",
        className
      )}
    >
      {topic}
    </span>
  );
}

/* ─── Count badge ─────────────────────────────────────────────────────────── */

type CountBadgeProps = {
  count: number;
  max?: number;
  label?: string;
};

export function CountBadge({ count, max = 9, label }: CountBadgeProps) {
  const display = count > max ? `${max}+` : count;
  return (
    <span
      className={ui.badgeCount}
      aria-label={label ?? `${count} items`}
    >
      {display}
    </span>
  );
}

/* ─── Generic Badge ──────────────────────────────────────────────────────── */

type BadgeProps = {
  children: ReactNode;
  variant?: "default" | "cyan" | "warning" | "error";
  className?: string;
};

const BADGE_VARIANT: Record<string, string> = {
  default: "bg-surface-raised text-secondary",
  cyan: "bg-cyan-muted text-cyan-glow",
  warning: "bg-[#422006] text-[#fbbf24]",
  error: "bg-error-surface text-error",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        ui.pill,
        BADGE_VARIANT[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
