"use client";

import { useState } from "react";
import {
  DIGEST_FORMATS,
  DIGEST_THEMES,
  TOPIC_OPTIONS,
} from "@/lib/digest-preferences";
import type { DigestFormat, DigestTheme } from "@/lib/auth/types";

type Props = {
  initial: {
    theme: DigestTheme;
    format: DigestFormat;
    max_stories: number;
    topic_filters: string[];
    email_enabled: boolean;
  };
};

export function DigestPreferenceForm({ initial }: Props) {
  const [theme, setTheme] = useState(initial.theme);
  const [format, setFormat] = useState(initial.format);
  const [maxStories, setMaxStories] = useState(initial.max_stories);
  const [topics, setTopics] = useState<string[]>(initial.topic_filters);
  const [emailEnabled, setEmailEnabled] = useState(initial.email_enabled);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

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
      }),
    });
    setSaving(false);
    setStatus(response.ok ? "Preferences saved." : "Could not save preferences.");
  }

  return (
    <form onSubmit={save} className="mt-8 space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#67e8f9]">
          Email theme
        </h2>
        <div className="mt-3 grid gap-3">
          {(Object.keys(DIGEST_THEMES) as DigestTheme[]).map((key) => (
            <label
              key={key}
              className={`flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 ${
                theme === key
                  ? "border-[#06b6d4] bg-[#164e63]"
                  : "border-[#243044] bg-[#1a2332]"
              }`}
            >
              <input
                type="radio"
                name="theme"
                checked={theme === key}
                onChange={() => setTheme(key)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium capitalize text-[#f0f9ff]">{key}</span>
                <span className="text-sm text-[#94a3b8]">{DIGEST_THEMES[key]}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#67e8f9]">
          Content format
        </h2>
        <div className="mt-3 grid gap-3">
          {(Object.keys(DIGEST_FORMATS) as DigestFormat[]).map((key) => (
            <label
              key={key}
              className={`flex cursor-pointer items-center gap-3 rounded-[20px] border p-4 ${
                format === key
                  ? "border-[#06b6d4] bg-[#164e63]"
                  : "border-[#243044] bg-[#1a2332]"
              }`}
            >
              <input
                type="radio"
                name="format"
                checked={format === key}
                onChange={() => setFormat(key)}
              />
              <span className="text-[#f0f9ff]">{DIGEST_FORMATS[key]}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <label className="text-sm font-semibold uppercase tracking-wide text-[#67e8f9]">
          Max stories: {maxStories}
        </label>
        <input
          type="range"
          min={3}
          max={12}
          value={maxStories}
          onChange={(e) => setMaxStories(Number(e.target.value))}
          className="mt-3 w-full accent-[#06b6d4]"
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#67e8f9]">
          Topic filters (optional)
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPIC_OPTIONS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => toggleTopic(topic.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                topics.includes(topic.id)
                  ? "bg-[#06b6d4] text-black"
                  : "border border-[#243044] text-[#94a3b8]"
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </section>

      <label className="flex items-center gap-3 text-[#f0f9ff]">
        <input
          type="checkbox"
          checked={emailEnabled}
          onChange={(e) => setEmailEnabled(e.target.checked)}
        />
        Receive daily digest emails
      </label>

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-[#06b6d4] px-8 py-3 text-sm font-semibold text-black hover:bg-[#22d3ee]"
      >
        {saving ? "Saving…" : "Save preferences"}
      </button>
      {status ? <p className="text-sm text-[#67e8f9]">{status}</p> : null}
    </form>
  );
}
