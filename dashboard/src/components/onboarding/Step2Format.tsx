import { cn } from "@/lib/cn";
import { Check } from "lucide-react";
import type { DigestFormat } from "@/lib/auth/types";

type Step2Props = {
  format: DigestFormat;
  onChange: (format: DigestFormat) => void;
};

export function Step2Format({ format, onChange }: Step2Props) {
  const options: { id: DigestFormat; label: string; desc: string }[] = [
    {
      id: "full",
      label: "Full Analysis",
      desc: "Complete summaries and insights.",
    },
    {
      id: "brief",
      label: "Brief",
      desc: "Short takeaways only, quick to read.",
    },
    {
      id: "headlines",
      label: "Headlines",
      desc: "Just the titles and sources.",
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-normal tracking-normal text-foreground sm:text-4xl">
        How much detail?
      </h2>
      <p className="mt-2 text-sm font-normal text-secondary">
        Choose how dense your daily digest should be. You can change this later.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {options.map((opt) => {
          const isSelected = format === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "group relative flex items-center justify-between rounded-2xl border p-5 text-left transition-all",
                isSelected
                  ? "border-foreground bg-surface-raised"
                  : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-raised/50"
              )}
            >
              <div>
                <p className="text-base font-normal text-foreground">
                  {opt.label}
                </p>
                <p className="mt-1 text-xs font-normal text-secondary">{opt.desc}</p>
              </div>

              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                  isSelected
                    ? "border border-foreground bg-foreground text-canvas scale-100"
                    : "border border-border bg-surface-raised text-transparent scale-0 group-hover:scale-100"
                )}
              >
                <Check size={14} strokeWidth={2.5} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
