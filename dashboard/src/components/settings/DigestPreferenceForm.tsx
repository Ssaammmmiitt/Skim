"use client";

import { useEffect, useMemo } from "react";
import type { DigestFormat, DigestFontStyle, DigestSummaryStyle, DigestTheme } from "@/lib/auth/types";
import { DashboardThemeSelector } from "@/components/theme/DashboardThemeSelector";
import { DigestFormatPreview } from "@/components/settings/DigestFormatPreview";
import { EmailThemePreview } from "@/components/settings/EmailThemePreview";
import { FontStyleSelector } from "@/components/settings/FontStyleSelector";
import { SummaryStyleSelector } from "@/components/settings/SummaryStyleSelector";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { TOPIC_OPTIONS } from "@/lib/digest-preferences";
import { usePreferencesStore } from "@/store/preferences-store";
import { useUnsubscribe } from "@/lib/useUnsubscribe";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";
import { Mail, MailX, Loader2 } from "lucide-react";

type Props = {
  initial: {
    theme: DigestTheme;
    format: DigestFormat;
    max_stories: number;
    topic_filters: string[];
    email_enabled: boolean;
    dashboard_theme: import("@/lib/auth/types").DashboardTheme;
    font_style: DigestFontStyle;
    summary_style: DigestSummaryStyle;
  };
};

const STORY_PRESETS = [5, 8, 10, 12] as const;

export function DigestPreferenceForm({ initial }: Props) {
  const draft = usePreferencesStore((state) => state.draft);
  const status = usePreferencesStore((state) => state.status);
  const saveError = usePreferencesStore((state) => state.saveError);
  const saving = usePreferencesStore((state) => state.saving);
  const hydrate = usePreferencesStore((state) => state.hydrate);
  const updateDraft = usePreferencesStore((state) => state.updateDraft);
  const toggleTopic = usePreferencesStore((state) => state.toggleTopic);
  const save = usePreferencesStore((state) => state.save);
  const { unsubscribe, resubscribe, loading: subLoading } = useUnsubscribe();

  useEffect(() => {
    hydrate(initial);
  }, [hydrate, initial]);

  const previewUrl = useMemo(
    () =>
      `/api/settings/digest-preview?theme=${draft.theme}&format=${draft.format}&font=${draft.font_style}&summary_style=${draft.summary_style}`,
    [draft.theme, draft.format, draft.font_style, draft.summary_style]
  );

  function incrementStories() {
    updateDraft({ max_stories: Math.min(12, draft.max_stories + 1) });
  }
  function decrementStories() {
    updateDraft({ max_stories: Math.max(3, draft.max_stories - 1) });
  }

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

      <div className="space-y-12 pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] sm:pb-36">

        {/* ── Section 1: Dashboard appearance ── */}
        <section>
          <h2 className={ui.eyebrow}>Dashboard appearance</h2>
          <p className={cn("mt-2", ui.body)}>
            Light canvas or dark mode — or match your device.
          </p>
          <div className="mt-4">
            <DashboardThemeSelector
              value={draft.dashboard_theme}
              onChange={(dashboard_theme) => updateDraft({ dashboard_theme })}
            />
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ── Section 2: Email theme ── */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={ui.eyebrow}>Email theme</h2>
              <p className={cn("mt-2", ui.body)}>
                How your daily digest email looks. Preview updates live below.
              </p>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(ui.btnGhost, "px-4 py-2 text-sm")}
            >
              Open full preview ↗
            </a>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(["cyan", "classic", "minimal", "rose", "amber", "violet", "slate"] as DigestTheme[]).map(
              (key) => (
                <EmailThemePreview
                  key={key}
                  theme={key}
                  format={draft.format}
                  fontStyle={draft.font_style}
                  selected={draft.theme === key}
                  onSelect={() => updateDraft({ theme: key })}
                />
              )
            )}
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ── Section 3: Email font ── */}
        <section>
          <h2 className={ui.eyebrow}>Email font</h2>
          <p className={cn("mt-2", ui.body)}>
            The typeface used for headlines and body text in your email.
          </p>
          <div className="mt-4">
            <FontStyleSelector
              value={draft.font_style}
              onChange={(font_style) => updateDraft({ font_style })}
            />
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ── Section 4: Content format ── */}
        <section>
          <h2 className={ui.eyebrow}>Content format</h2>
          <p className={cn("mt-2", ui.body)}>
            Control how much detail each story includes in your digest.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
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

        <div className="border-t border-border" />

        {/* ── Section 5: Summary style ── */}
        <section>
          <h2 className={ui.eyebrow}>Summary style</h2>
          <p className={cn("mt-2", ui.body)}>
            How article content is formatted in each story card.
          </p>
          <div className="mt-4">
            <SummaryStyleSelector
              value={draft.summary_style}
              onChange={(summary_style) => updateDraft({ summary_style })}
            />
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ── Section 6: Live preview iframe ── */}
        <section className={cn(ui.card, "overflow-hidden rounded-2xl")}>
          <div className={cn("border-b border-border px-5 py-3 text-xs font-normal text-muted")}>
            Live email preview — reflects your theme, font, and format choices
          </div>
          <iframe
            title="Digest email preview"
            src={previewUrl}
            className="h-[420px] w-full bg-canvas"
          />
        </section>

        <div className="border-t border-border" />

        {/* ── Section 7: Stories per digest ── */}
        <section>
          <h2 className={ui.eyebrow}>Stories per digest</h2>
          <p className={cn("mt-2", ui.body)}>
            How many stories you receive in each daily email. Range: 3–12.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {/* Quick-select preset chips */}
            <div className="flex items-center gap-2">
              {STORY_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateDraft({ max_stories: n })}
                  className={cn(
                    "h-10 min-w-[2.75rem] rounded-xl border px-4 text-sm font-normal transition-all duration-150",
                    draft.max_stories === n
                      ? "border-foreground bg-foreground text-canvas"
                      : "border-border bg-surface text-secondary hover:border-foreground/40 hover:text-foreground"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface">
              <button
                type="button"
                onClick={decrementStories}
                disabled={draft.max_stories <= 3}
                className="flex h-10 w-10 items-center justify-center rounded-l-xl text-secondary transition hover:bg-surface-raised hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Decrease story count"
              >
                −
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-normal text-foreground">
                {draft.max_stories}
              </span>
              <button
                type="button"
                onClick={incrementStories}
                disabled={draft.max_stories >= 12}
                className="flex h-10 w-10 items-center justify-center rounded-r-xl text-secondary transition hover:bg-surface-raised hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Increase story count"
              >
                +
              </button>
            </div>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ── Section 8: Topic filters ── */}
        <section>
          <h2 className={ui.eyebrow}>Topic filters (optional)</h2>
          <p className={cn("mt-2", ui.body)}>
            Leave empty to receive all topics. The pipeline filters stories before sending.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {TOPIC_OPTIONS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-normal transition",
                  draft.topic_filters.includes(topic.id)
                    ? "border border-foreground bg-foreground text-canvas"
                    : "border border-border bg-surface-raised text-secondary hover:border-foreground/40 hover:text-foreground"
                )}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </section>

        <div className="border-t border-border" />

        {/* ── Section 9: Email delivery (unsubscribe) ── */}
        <section>
          <h2 className={ui.eyebrow}>Email delivery</h2>
          <p className={cn("mt-2", ui.body)}>
            Manage whether you receive the daily digest email.
          </p>

          <div className={cn(ui.card, "mt-5 flex items-center justify-between gap-4 rounded-2xl p-5")}>
            <div className="flex items-center gap-4">
              {/* Status icon */}
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                  draft.email_enabled
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-surface-raised text-secondary"
                )}
              >
                {draft.email_enabled ? <Mail size={18} /> : <MailX size={18} />}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-normal text-foreground">
                    Daily digest emails
                  </p>
                  {/* Status pill */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-normal",
                      draft.email_enabled
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-surface-raised text-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        draft.email_enabled ? "bg-emerald-400" : "bg-muted"
                      )}
                    />
                    {draft.email_enabled ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-normal text-secondary">
                  {draft.email_enabled
                    ? "You'll receive tomorrow's briefing in your inbox."
                    : "You won't receive daily emails until you re-enable."}
                </p>
              </div>
            </div>

            {/* Action button */}
            {draft.email_enabled ? (
              <button
                type="button"
                onClick={() => void unsubscribe()}
                disabled={subLoading}
                className={cn(
                  "shrink-0 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-normal text-secondary transition hover:border-foreground/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {subLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" /> Pausing…
                  </span>
                ) : (
                  "Unsubscribe"
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void resubscribe()}
                disabled={subLoading}
                className={cn(
                  ui.btnPrimary,
                  "shrink-0 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {subLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" /> Re-enabling…
                  </span>
                ) : (
                  "Re-enable emails"
                )}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ── Sticky save bar ── */}
      <div className={ui.settingsBar}>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-4 md:px-8">
          <p
            className={cn(
              "text-center text-sm font-normal sm:text-left",
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
