import { TOPIC_OPTIONS } from "@/lib/digest-preferences";
import { cn } from "@/lib/cn";
import { Check, Sparkles, CheckCircle2 } from "lucide-react";

type Step1Props = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function Step1Topics({ selected, onChange }: Step1Props) {
  const availableTopics = TOPIC_OPTIONS.filter((t) => t.id !== "other");

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function handleSelectAll() {
    if (selected.length === availableTopics.length) {
      onChange([]);
    } else {
      onChange(availableTopics.map((t) => t.id));
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-normal text-foreground">
          <Sparkles size={13} />
          <span>Step 1 · Feed Selection</span>
        </span>

        <button
          type="button"
          onClick={handleSelectAll}
          className="text-xs font-normal text-secondary hover:text-foreground hover:underline"
        >
          {selected.length === availableTopics.length ? "Deselect all" : "Select all"}
        </button>
      </div>

      <h2 className="mt-4 text-3xl font-normal tracking-normal text-foreground sm:text-4xl">
        What do you want to read?
      </h2>
      <p className="mt-2 text-sm font-normal text-secondary">
        Select the tech & AI topics you want in your daily briefing. We will tailor your feed to prioritize these.
      </p>

      {selected.length === 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-xs font-normal text-secondary">
          <span>Please select at least one topic to personalize your digest.</span>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5 text-xs font-normal text-foreground">
          <CheckCircle2 size={15} />
          <span>{selected.length} topic{selected.length === 1 ? "" : "s"} selected for your personalized feed</span>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        {availableTopics.map((t) => {
          const isSelected = selected.includes(t.id);

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all",
                isSelected
                  ? "border-foreground bg-surface-raised"
                  : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-raised/50"
              )}
            >
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-normal text-foreground">
                {t.label}
              </span>

              <p className="text-xs font-normal text-secondary group-hover:text-foreground">
                Follow curated stories in {t.label}
              </p>
              
              <div
                className={cn(
                  "absolute right-3.5 top-3.5 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200",
                  isSelected
                    ? "border border-foreground bg-foreground text-canvas scale-100"
                    : "border border-border bg-surface-raised text-transparent scale-0 group-hover:scale-100 group-hover:text-muted"
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
