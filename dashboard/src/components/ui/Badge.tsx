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
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wire opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-wire" />
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
  ai: "border border-border-on-dark/30 bg-surface text-on-canvas",
  web: "border border-border-on-dark/30 bg-surface text-on-canvas",
  cloud: "border border-border-on-dark/30 bg-surface text-on-canvas",
  security: "border border-border-on-dark/30 bg-surface text-on-canvas",
  startups: "border border-border-on-dark/30 bg-surface text-on-canvas",
  code: "border border-border-on-dark/30 bg-surface text-on-canvas",
  science: "border border-border-on-dark/30 bg-surface text-on-canvas",
};

export function TopicBadge2({ topic, className }: TopicBadgeProps) {
  const key = topic?.toLowerCase() ?? "";
  return (
    <span
      className={cn(
        ui.badgeTopic,
        TOPIC_CLASS[key] ?? "border border-border-on-dark/20 bg-surface text-on-canvas",
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
  default: "border border-hairline-soft/40 bg-surface text-secondary",
  cyan: "border border-border-on-dark bg-on-canvas-soft text-on-pill",
  warning: "border border-warning/40 bg-surface text-warning",
  error: "border border-error bg-error-surface text-error",
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
