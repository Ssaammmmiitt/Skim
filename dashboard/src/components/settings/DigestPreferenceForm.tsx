"use client";

import { useEffect, useMemo } from "react";
import type { DigestFormat, DigestTheme } from "@/lib/auth/types";
import { DashboardThemeSelector } from "@/components/theme/DashboardThemeSelector";
import { DigestFormatPreview } from "@/components/settings/DigestFormatPreview";
import { EmailThemePreview } from "@/components/settings/EmailThemePreview";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { TOPIC_OPTIONS } from "@/lib/digest-preferences";
import { usePreferencesStore } from "@/store/preferences-store";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type Props = {
  initial: {
    theme: DigestTheme;
    format: DigestFormat;
    max_stories: number;
    topic_filters: string[];
    email_enabled: boolean;
    dashboard_theme: import("@/lib/auth/types").DashboardTheme;
  };
};

export function DigestPreferenceForm({ initial }: Props) {
  const draft = usePreferencesStore((state) => state.draft);
  const status = usePreferencesStore((state) => state.status);
  const saveError = usePreferencesStore((state) => state.saveError);
  const saving = usePreferencesStore((state) => state.saving);
  const hydrate = usePreferencesStore((state) => state.hydrate);
  const updateDraft = usePreferencesStore((state) => state.updateDraft);
  const toggleTopic = usePreferencesStore((state) => state.toggleTopic);
  const save = usePreferencesStore((state) => state.save);

  useEffect(() => {
    hydrate(initial);
  }, [hydrate, initial]);

  const previewUrl = useMemo(
    () => `/api/settings/digest-preview?theme=${draft.theme}&format=${draft.format}`,
    [draft.theme, draft.format]
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="mt-8"
    >
      {saveError ? (
        <ErrorAlert
          message={saveError}
          onRetry={() => void save()}
          className="mb-6"
        />
      ) : null}

      <div className="space-y-10 pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] sm:pb-36">
        <section>
          <h2 className={ui.eyebrow}>Dashboard appearance</h2>
          <p className={cn("mt-2", ui.body)}>
            Light canvas or dark mode  -  or match your device.
          </p>
          <div className="mt-4">
            <DashboardThemeSelector
              value={draft.dashboard_theme}
              onChange={(dashboard_theme) => updateDraft({ dashboard_theme })}
            />
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={ui.eyebrow}>Email theme</h2>
              <p className={cn("mt-2", ui.body)}>
                Pick how your daily digest email looks. Preview updates as you
                select.
              </p>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(ui.btnGhost, "px-4 py-2 text-sm")}
            >
              Open full preview
            </a>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(["cyan", "classic", "minimal"] as DigestTheme[]).map((key) => (
              <EmailThemePreview
                key={key}
                theme={key}
                format={draft.format}
                selected={draft.theme === key}
                onSelect={() => updateDraft({ theme: key })}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className={ui.eyebrow}>Email content format</h2>
          <p className={cn("mt-2", ui.body)}>
            Control how much detail each story includes in your digest.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(["full", "brief", "headlines"] as DigestFormat[]).map((key) => (
              <DigestFormatPreview
                key={key}
                format={key}
                selected={draft.format === key}
                onSelect={() => updateDraft({ format: key })}
              />
            ))}
          </div>
        </section>

        <section className={cn(ui.card, "overflow-hidden")}>
          <div className={cn("border-b border-surface-raised px-4 py-2", ui.meta)}>
            Live email preview
          </div>
          <iframe
            title="Digest email preview"
            src={previewUrl}
            className="h-[420px] w-full bg-canvas"
          />
        </section>

        <section>
          <label className={ui.eyebrow}>
            Max stories: {draft.max_stories}
          </label>
          <input
            type="range"
            min={3}
            max={12}
            value={draft.max_stories}
            onChange={(e) =>
              updateDraft({ max_stories: Number(e.target.value) })
            }
            className="mt-3 w-full accent-primary"
          />
        </section>

        <section>
          <h2 className={ui.eyebrow}>Topic filters (optional)</h2>
          <p className={cn("mt-2", ui.body)}>
            Leave empty to receive all topics. The pipeline filters stories
            before sending.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOPIC_OPTIONS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                className={cn(
                  "rounded-pill px-3 py-1.5 text-xs font-bold transition",
                  draft.topic_filters.includes(topic.id)
                    ? "bg-cyan-core text-black"
                    : "border border-surface-raised bg-canvas text-secondary hover:border-cyan-core"
                )}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </section>

        <label className="flex items-center gap-3 text-foreground">
          <input
            type="checkbox"
            checked={draft.email_enabled}
            onChange={(e) => updateDraft({ email_enabled: e.target.checked })}
            className="accent-primary"
          />
          <span className={ui.body}>Receive daily digest emails</span>
        </label>
      </div>

      <div className={ui.settingsBar}>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-4 md:px-8">
          <p
            className={cn(
              "text-center text-sm sm:text-left",
              status ? ui.successText : "text-muted"
            )}
          >
            {status || "Changes apply after you save."}
          </p>
          <button
            type="submit"
            disabled={saving}
            className={cn(ui.btnPrimary, "min-h-11 w-full shrink-0 px-8 sm:w-auto")}
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </div>
    </form>
  );
}
