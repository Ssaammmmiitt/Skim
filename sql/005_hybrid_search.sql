-- Phase 6B: Hybrid RAG retrieval (MiniLM 384-dim + FTS + RRF)
-- Run in Supabase SQL Editor after 004_search_fts.sql
--
-- Uses the existing articles.embedding column (all-MiniLM-L6-v2, same as pipeline).
-- Dashboard embeds queries with the same model via @xenova/transformers.
--
-- Note: return types use double precision (not float/real) to match pgvector
-- distance and FLOAT column outputs and avoid:
--   "structure of query does not match function result type"

-- 1. Vector similarity (pipeline MiniLM embeddings)
CREATE OR REPLACE FUNCTION search_articles_vector(
  query_embedding vector(384),
  match_count int DEFAULT 10,
  match_threshold double precision DEFAULT 0.25
) RETURNS TABLE (
  id int,
  title text,
  url text,
  source text,
  summary text,
  insight text,
  topic text,
  importance_score double precision,
  key_takeaway text,
  published_at timestamptz,
  similarity double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.title, a.url, a.source, a.summary,
    a.insight, a.topic, a.importance_score, a.key_takeaway,
    a.published_at,
    (1 - (a.embedding <=> query_embedding))::double precision AS similarity
  FROM articles a
  WHERE a.embedding IS NOT NULL
    AND (1 - (a.embedding <=> query_embedding)) >= match_threshold
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION search_articles_vector(vector, int, double precision)
  TO anon, authenticated;

-- 2. Keyword FTS with rank (for RRF)
CREATE OR REPLACE FUNCTION search_articles_fts(
  query_text text,
  match_count int DEFAULT 10
) RETURNS TABLE (
  id int,
  title text,
  url text,
  source text,
  summary text,
  insight text,
  topic text,
  importance_score double precision,
  key_takeaway text,
  published_at timestamptz,
  fts_rank double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.title, a.url, a.source, a.summary,
    a.insight, a.topic, a.importance_score, a.key_takeaway,
    a.published_at,
    ts_rank_cd(
      COALESCE(a.search_vector, to_tsvector('english', coalesce(a.title, '') || ' ' || coalesce(a.summary, ''))),
      websearch_to_tsquery('english', query_text)
    )::double precision AS fts_rank
  FROM articles a
  WHERE COALESCE(a.search_vector, to_tsvector('english', coalesce(a.title, '') || ' ' || coalesce(a.summary, '')))
    @@ websearch_to_tsquery('english', query_text)
  ORDER BY fts_rank DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION search_articles_fts(text, int)
  TO anon, authenticated;

-- 3. Hybrid RRF: fuse vector + FTS rankings
CREATE OR REPLACE FUNCTION search_articles_hybrid(
  query_embedding vector(384),
  query_text text,
  match_count int DEFAULT 10,
  vector_weight double precision DEFAULT 0.55,
  fts_weight double precision DEFAULT 0.45,
  rrf_k int DEFAULT 60
) RETURNS TABLE (
  id int,
  title text,
  url text,
  source text,
  summary text,
  insight text,
  topic text,
  importance_score double precision,
  key_takeaway text,
  published_at timestamptz,
  similarity double precision,
  fts_rank double precision,
  rrf_score double precision
) AS $$
WITH vector_results AS (
  SELECT
    v.id, v.title, v.url, v.source, v.summary,
    v.insight, v.topic, v.importance_score, v.key_takeaway,
    v.published_at, v.similarity,
    ROW_NUMBER() OVER (ORDER BY v.similarity DESC NULLS LAST) AS rank_v
  FROM search_articles_vector(query_embedding, match_count * 2, 0.2) v
),
fts_results AS (
  SELECT
    f.id, f.title, f.url, f.source, f.summary,
    f.insight, f.topic, f.importance_score, f.key_takeaway,
    f.published_at, f.fts_rank,
    ROW_NUMBER() OVER (ORDER BY f.fts_rank DESC NULLS LAST) AS rank_f
  FROM search_articles_fts(query_text, match_count * 2) f
),
combined AS (
  SELECT
    COALESCE(v.id, f.id) AS id,
    COALESCE(v.title, f.title) AS title,
    COALESCE(v.url, f.url) AS url,
    COALESCE(v.source, f.source) AS source,
    COALESCE(v.summary, f.summary) AS summary,
    COALESCE(v.insight, f.insight) AS insight,
    COALESCE(v.topic, f.topic) AS topic,
    COALESCE(v.importance_score, f.importance_score) AS importance_score,
    COALESCE(v.key_takeaway, f.key_takeaway) AS key_takeaway,
    COALESCE(v.published_at, f.published_at) AS published_at,
    v.similarity,
    f.fts_rank,
    (
      vector_weight * COALESCE(1.0 / (rrf_k + v.rank_v), 0) +
      fts_weight   * COALESCE(1.0 / (rrf_k + f.rank_f), 0)
    )::double precision AS rrf_score
  FROM vector_results v
  FULL OUTER JOIN fts_results f ON v.id = f.id
)
SELECT
  c.id, c.title, c.url, c.source, c.summary,
  c.insight, c.topic, c.importance_score, c.key_takeaway,
  c.published_at, c.similarity, c.fts_rank, c.rrf_score
FROM combined c
WHERE c.id IS NOT NULL
ORDER BY c.rrf_score DESC NULLS LAST
LIMIT match_count;
$$ LANGUAGE sql
SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION search_articles_hybrid(vector, text, int, double precision, double precision, int)
  TO anon, authenticated;
