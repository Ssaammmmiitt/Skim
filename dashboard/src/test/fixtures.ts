import type {
  ChatMessage,
  ChatSource,
  DigestArticle,
  DigestResponse,
} from "@/lib/types";
import type { Profile } from "@/lib/auth/types";

export const sampleArticle: DigestArticle = {
  id: 1,
  title: "OpenAI launches new model",
  url: "https://example.com/openai",
  source: "techcrunch",
  published_at: "2026-08-30T12:00:00.000Z",
  summary: "A major model release shakes up the industry.",
  topic: "ai_ml",
  importance_score: 8.7,
  insight: "Enterprise adoption may accelerate.",
  key_takeaway: "Watch pricing and API limits.",
};

export const sampleArticle2: DigestArticle = {
  ...sampleArticle,
  id: 2,
  title: "Rust 2.0 roadmap announced",
  topic: "programming",
  source: "hackernews",
  url: "https://example.com/rust",
};

export const sampleDigest: DigestResponse = {
  date: "2026-08-30",
  articles: [sampleArticle, sampleArticle2],
  sent_at: "2026-08-30T00:20:00.000Z",
  subject: "Skim Daily Digest",
  story_count: 2,
};

export const emptyDigest: DigestResponse = {
  date: "2026-08-30",
  articles: [],
  sent_at: null,
  subject: null,
  story_count: 0,
};

export const sampleSource: ChatSource = {
  id: 1,
  title: "OpenAI launches new model",
  url: "https://example.com/openai",
  source: "techcrunch",
  published_at: "2026-08-30T12:00:00.000Z",
  topic: "ai_ml",
};

export const userMessage: ChatMessage = {
  id: "user-1",
  role: "user",
  content: "What happened in AI?",
};

export const assistantMessage: ChatMessage = {
  id: "assistant-1",
  role: "assistant",
  content: "OpenAI announced a new model.",
  sources: [sampleSource],
};

export const activeSuperuser: Profile = {
  id: "user-1",
  email: "admin@example.com",
  display_name: "Admin",
  avatar_url: null,
  role: "superuser",
  status: "active",
  created_at: "2026-08-01T00:00:00.000Z",
  approved_at: "2026-08-01T00:00:00.000Z",
};

export const pendingMember: Profile = {
  ...activeSuperuser,
  id: "user-2",
  email: "pending@example.com",
  role: "member",
  status: "pending",
  approved_at: null,
};
