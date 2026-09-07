"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/* ─── Store ──────────────────────────────────────────────────────────────── */

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function notify() {
  const copy = [...toasts];
  listeners.forEach((l) => l(copy));
}

/**
 * Programmatic API — call from anywhere:
 * ```ts
 * import { toast } from "@/components/ui/Toast";
 * toast.success("Saved!");
 * toast.error("Something went wrong");
 * toast.info("Digest updated");
 * ```
 */
export const toast = {
  success: (message: string, duration = 4000) => add(message, "success", duration),
  error: (message: string, duration = 6000) => add(message, "error", duration),
  info: (message: string, duration = 4000) => add(message, "info", duration),
};

function add(message: string, variant: ToastVariant, duration: number) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  toasts = [...toasts, { id, message, variant, duration }];
  notify();
  return id;
}

function remove(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function IconSuccess() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconError() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-cyan-deep bg-cyan-muted/80 text-cyan-glow",
  error: "border-error-surface bg-error-surface/60 text-error",
  info: "border-surface-raised bg-surface text-foreground",
};

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <IconSuccess />,
  error: <IconError />,
  info: <IconInfo />,
};

/* ─── Single toast item ──────────────────────────────────────────────────── */

function ToastTile({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => remove(item.id), 300);
    }, item.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [item.id, item.duration]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "flex min-w-[18rem] max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm",
        "transition-all duration-300",
        VARIANT_STYLES[item.variant],
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0 pointer-events-none"
      )}
    >
      <span className="mt-0.5 shrink-0">{VARIANT_ICONS[item.variant]}</span>
      <p className="flex-1 text-sm leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(() => remove(item.id), 300);
        }}
        className="shrink-0 opacity-60 transition hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Toast portal / container ───────────────────────────────────────────── */

/**
 * Render `<ToastProvider />` once in your root layout (inside AppShellClient or similar).
 * Then call `toast.success("...")` from anywhere.
 */
export function ToastProvider() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (updated) => setItems(updated);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 px-4 pb-safe sm:left-auto sm:right-4 sm:translate-x-0 sm:items-end"
    >
      {items.map((item) => (
        <ToastTile key={item.id} item={item} />
      ))}
    </div>
  );
}
