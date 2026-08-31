"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

const STEPS = [
  { label: "Embedding your question", detail: "MiniLM 384-dim (same as pipeline)" },
  { label: "Searching the corpus", detail: "Hybrid vector + full-text + RRF" },
  { label: "Generating answer", detail: "Gemini → fallback models → Groq" },
] as const;

type ChatLoadingBubbleProps = {
  /** Changes when a new request starts so the step indicator resets once. */
  sessionKey: string;
};

export function ChatLoadingBubble({ sessionKey }: ChatLoadingBubbleProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    const timer = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
    }, 2400);
    return () => window.clearInterval(timer);
  }, [sessionKey]);

  const active = STEPS[step];

  return (
    <div className="flex justify-start" role="status" aria-live="polite">
      <div className={cn(ui.card, "max-w-md px-4 py-3")}>
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-surface-raised border-t-cyan-bright"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{active.label}…</p>
            <p className="mt-0.5 text-xs text-muted">{active.detail}</p>
            <div className="mt-3 flex gap-1">
              {STEPS.map((item, index) => (
                <span
                  key={item.label}
                  className={cn(
                    "h-1 flex-1 rounded-pill transition-colors",
                    index <= step ? "bg-cyan-bright" : "bg-surface-raised"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
