-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Core articles table
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    raw_text TEXT,
    summary TEXT,
    embedding vector(384),
    topic TEXT,
    importance_score FLOAT,
    insight TEXT,
    key_takeaway TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    digest_date DATE
);

-- Digests tracking (for idempotency)
CREATE TABLE IF NOT EXISTS digests (
    id SERIAL PRIMARY KEY,
    digest_date DATE UNIQUE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    article_ids INTEGER[] NOT NULL,
    story_count INTEGER NOT NULL,
    subject TEXT
);

-- Pipeline run observability
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id SERIAL PRIMARY KEY,
    run_date DATE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'running',
    articles_ingested INTEGER DEFAULT 0,
    articles_embedded INTEGER DEFAULT 0,
    articles_classified INTEGER DEFAULT 0,
    digest_sent BOOLEAN DEFAULT FALSE,
    errors JSONB DEFAULT '[]',
    duration_seconds FLOAT
);

-- Vector similarity search index.
-- HNSW rather than ivfflat: ivfflat needs a large, well-distributed corpus to
-- train its lists, and silently loses most recall on a small table.
DROP INDEX IF EXISTS articles_embedding_idx;
CREATE INDEX IF NOT EXISTS articles_embedding_hnsw_idx ON articles
    USING hnsw (embedding vector_cosine_ops);

-- Fast lookups
CREATE INDEX IF NOT EXISTS articles_digest_date_idx ON articles(digest_date);
CREATE INDEX IF NOT EXISTS articles_source_idx ON articles(source);
CREATE INDEX IF NOT EXISTS articles_topic_idx ON articles(topic);

-- Dashboard RPC: semantic search over article embeddings
CREATE OR REPLACE FUNCTION search_similar_articles(
    query_embedding vector(384),
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.5
) RETURNS TABLE (
    id int,
    title text,
    url text,
    source text,
    summary text,
    insight text,
    published_at timestamptz,
    similarity float
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.title, a.url, a.source, a.summary,
           a.insight, a.published_at,
           1 - (a.embedding <=> query_embedding) AS similarity
    FROM articles a
    WHERE a.embedding IS NOT NULL
    ORDER BY a.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION search_similar_articles(vector, int, float) TO anon, authenticated;
