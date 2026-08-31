"use client";

import { useMemo, useState } from "react";
import type { DashboardTheme, DigestFormat, DigestTheme } from "@/lib/auth/types";
import { DashboardThemeSelector } from "@/components/theme/DashboardThemeSelector";
import { DigestFormatPreview } from "@/components/settings/DigestFormatPreview";
import { EmailThemePreview } from "@/components/settings/EmailThemePreview";
import { TOPIC_OPTIONS } from "@/lib/digest-preferences";
import { applyDashboardTheme } from "@/lib/dashboard-theme";
import { cn } from "@/lib/cn";

type Props = {
  initial: {
    theme: DigestTheme;
    format: DigestFormat;
    max_stories: number;
    topic_filters: string[];
    email_enabled: boolean;
    dashboard_theme: DashboardTheme;
  };
};

export function DigestPreferenceForm({ initial }: Props) {
  const [theme, setTheme] = useState(initial.theme);
  const [format, setFormat] = useState(initial.format);
  const [maxStories, setMaxStories] = useState(initial.max_stories);
  const [topics, setTopics] = useState<string[]>(initial.topic_filters);
  const [emailEnabled, setEmailEnabled] = useState(initial.email_enabled);
  const [dashboardTheme, setDashboardTheme] = useState(initial.dashboard_theme);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const previewUrl = useMemo(
    () => `/api/settings/digest-preview?theme=${theme}&format=${format}`,
    [theme, format]
  );

  function toggleTopic(topicId: string) {
    setTopics((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId]
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    const response = await fetch("/api/settings/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme,
        format,
        max_stories: maxStories,
        topic_filters: topics.length ? topics : null,
        email_enabled: emailEnabled,
        dashboard_theme: dashboardTheme,
      }),
    });
    setSaving(false);
    if (response.ok) {
      setStatus("Preferences saved.");
      applyDashboardTheme(dashboardTheme);
    } else {
      setStatus("Could not save preferences.");
    }
  }

  return (
    <form onSubmit={save} className="mt-8 space-y-10">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-glow">
          Dashboard appearance
        </h2>
        <p className="mt-1 skim-body">
          Choose light, dark, or system mode for the Skim website.
        </p>
        <div className="mt-4">
          <DashboardThemeSelector
            value={dashboardTheme}
            onChange={setDashboardTheme}
          />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-glow">
              Email theme
            </h2>
            <p className="mt-1 skim-body">
              Pick how your daily digest email looks. Preview updates as you select.
            </p>
          </div>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="skim-btn-ghost text-[10px]"
          >
            Open full preview
          </a>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(["cyan", "classic", "minimal"] as DigestTheme[]).map((key) => (
            <EmailThemePreview
              key={key}
              theme={key}
              format={format}
              selected={theme === key}
              onSelect={() => setTheme(key)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-glow">
          Email content format
        </h2>
        <p className="mt-1 skim-body">
          Control how much detail each story includes in your digest.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(["full", "brief", "headlines"] as DigestFormat[]).map((key) => (
            <DigestFormatPreview
              key={key}
              format={key}
              selected={format === key}
              onSelect={() => setFormat(key)}
            />
          ))}
        </div>
      </section>

      <section className="skim-card overflow-hidden">
        <div className="border-b border-surface-raised px-4 py-2 skim-meta">
          Live email preview
        </div>
        <iframe
          title="Digest email preview"
          src={previewUrl}
          className="h-[420px] w-full bg-canvas"
        />
      </section>

      <section>
        <label className="text-sm font-semibold uppercase tracking-wide text-cyan-glow">
          Max stories: {maxStories}
        </label>
        <input
          type="range"
          min={3}
          max={12}
          value={maxStories}
          onChange={(e) => setMaxStories(Number(e.target.value))}
          className="mt-3 w-full accent-cyan-core"
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-glow">
          Topic filters (optional)
        </h2>
        <p className="mt-1 skim-body">
          Leave empty to receive all topics. The pipeline filters stories before
          sending.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPIC_OPTIONS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => toggleTopic(topic.id)}
              className={cn(
                "rounded-pill px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                topics.includes(topic.id)
                  ? "bg-cyan-core text-black"
                  : "border border-surface-raised text-secondary"
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
          checked={emailEnabled}
          onChange={(e) => setEmailEnabled(e.target.checked)}
          className="accent-cyan-core"
        />
        Receive daily digest emails
      </label>

      <button type="submit" disabled={saving} className="skim-btn-primary px-8 py-3">
        {saving ? "Saving…" : "Save all preferences"}
      </button>
      {status ? <p className="skim-success">{status}</p> : null}
    </form>
  );
}
