-- Full-text search on article title + summary (Phase 6B Task 6.2)
-- Run in Supabase SQL Editor after schema.sql / 002 / 003.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS articles_search_vector_idx
  ON articles USING gin(search_vector);
