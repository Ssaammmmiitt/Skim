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
