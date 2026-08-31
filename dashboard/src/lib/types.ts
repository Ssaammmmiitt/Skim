export interface SearchResult {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  topic: string | null;
  importance_score: number | null;
  summary?: string | null;
  insight?: string | null;
  key_takeaway?: string | null;
  similarity?: number | null;
  fts_rank?: number | null;
  rrf_score?: number | null;
  retrieval_method?: "hybrid" | "vector" | "fts" | "keyword";
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  mode?: string;
}

export interface ChatSource {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  topic: string | null;
  similarity?: number | null;
  rrf_score?: number | null;
  retrieval_method?: "hybrid" | "vector" | "fts" | "keyword";
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
  retrieval_method?: string;
  provider?: "gemini" | "groq";
  model?: string;
}

export type ChatErrorCode =
  | "quota_exhausted"
  | "rate_limited"
  | "all_providers_failed"
  | "config"
  | "empty_response"
  | "unknown";

export interface ChatApiError {
  error: string;
  error_code?: ChatErrorCode;
  provider?: "gemini" | "groq";
  model?: string;
  retry_after_seconds?: number;
  tried_providers?: string[];
  details?: string;
}

export interface ChatApiResponse {
  answer: string;
  sources: ChatSource[];
  remaining: number;
  used: number;
  retrieval_method?: "hybrid" | "vector" | "fts" | "keyword" | "none";
  provider?: "gemini" | "groq";
  model?: string;
  articles_retrieved?: number;
}

export interface DigestArticle {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  summary: string | null;
  topic: string | null;
  importance_score: number | null;
  insight: string | null;
  key_takeaway: string | null;
}

export interface DigestResponse {
  date: string;
  articles: DigestArticle[];
  sent_at: string | null;
  subject: string | null;
  story_count: number;
}

export interface Article {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  raw_text: string | null;
  summary: string | null;
  embedding: number[] | null;
  topic: string | null;
  importance_score: number | null;
  insight: string | null;
  key_takeaway: string | null;
  created_at: string | null;
  digest_date: string | null;
}

export interface Digest {
  id: number;
  digest_date: string;
  sent_at: string | null;
  article_ids: number[];
  story_count: number;
  subject: string | null;
}

export type PipelineRunStatus = "running" | "success" | "partial" | "failed";

export interface PipelineRun {
  id: number;
  run_date: string;
  started_at: string | null;
  completed_at: string | null;
  status: PipelineRunStatus;
  articles_ingested: number;
  articles_embedded: number;
  articles_classified: number;
  digest_sent: boolean;
  errors: unknown[];
  duration_seconds: number | null;
}
