import type { DigestFormat, DigestTheme } from "@/lib/auth/types";

export const DIGEST_THEMES: Record<DigestTheme, string> = {
  cyan: "Skim Dark — cyan on near-black",
  classic: "Classic Light — white card layout",
  minimal: "Minimal — serif, text-first",
};

export const DIGEST_FORMATS: Record<DigestFormat, string> = {
  full: "Full — insights, takeaways, summaries",
  brief: "Brief — headlines and takeaways",
  headlines: "Headlines — titles and links only",
};

export const TOPIC_OPTIONS = [
  { id: "ai_ml", label: "AI / ML" },
  { id: "web_dev", label: "Web Dev" },
  { id: "cloud_infra", label: "Cloud" },
  { id: "cybersecurity", label: "Security" },
  { id: "startups", label: "Startups" },
  { id: "programming", label: "Programming" },
  { id: "science", label: "Science" },
  { id: "other", label: "Other" },
] as const;
