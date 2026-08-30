# Skim

> An agentic AI news digest pipeline that scrapes, reasons, and delivers curated tech news daily — with a RAG-powered dashboard for exploration.

## What is Skim?

Skim is a fully automated system that:

1. **Ingests** tech news daily from Hacker News and RSS feeds (TechCrunch, Ars Technica, The Verge, MIT Technology Review)
2. **Embeds** articles locally with sentence-transformers for semantic search over the full corpus
3. **Reasons** over articles using LLMs with function calling (classify topics, score importance, generate editorial insights) — *planned*
4. **Selects** the day's top stories through multi-pass agentic reasoning — *planned*
5. **Delivers** a curated HTML email digest every morning — *planned*
6. **Serves** a web dashboard with archive browsing and RAG-powered chat — *planned*

All designed to run on free-tier infrastructure.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Pipeline | Python 3.11 | Scraping, NLP, embeddings |
| Dashboard | Next.js 16 + TypeScript | Server components, API routes |
| Database | Supabase (PostgreSQL + pgvector) | Relational + vector in one DB |
| LLM | Gemini 2.5 Flash (primary) + Groq fallback | High TPM for RAG; Groq for speed when Gemini is rate-limited |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Local, zero API cost |
| Email | Resend | 3,000 emails/month free |
| Scheduler | GitHub Actions cron | Free minutes, built-in secrets |
| Frontend hosting | Vercel | Free hobby tier |

## What's Built

**Ingestion**
- Source adapters for Hacker News and RSS feeds with graceful per-source failure handling
- URL normalization and deduplication (`ON CONFLICT DO NOTHING`)
- HTML stripped from RSS summaries, capped at 1,000 characters

**Embeddings**
- Local `all-MiniLM-L6-v2` embeddings over `title + summary`
- Idempotent `embed_new_articles()` — only processes rows with `NULL` embeddings
- Cosine similarity search in Python and via Supabase RPC (`search_similar_articles`)
- HNSW index for vector search (ivfflat loses most recall on a small corpus)

**Infrastructure**
- Supabase schema with `articles`, `digests`, and `pipeline_runs` tables
- GitHub Actions workflow (daily cron + manual trigger) with sentence-transformers model caching
- Next.js dashboard scaffold with Supabase client wired up

**Tests**
- 38 pytest tests covering adapters, dedup, DB inserts, embeddings, and similarity search

## Architecture

```
GitHub Actions (cron, daily 00:15 UTC)
        │
        ▼
┌─────────────────┐
│ 1. Ingestion    │  Hacker News API + RSS feeds
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. Dedup/Store  │  Postgres (Supabase) — articles table
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. Embed        │  sentence-transformers → pgvector
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4. Agent Reason │  Groq/Gemini function calling  (planned)
│                 │   classify → insight → selection
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. Compose+Send │  Jinja2 HTML → Resend email     (planned)
└────────┬────────┘
         ▼
┌─────────────────┐
│ 6. Dashboard    │  Next.js — archive + RAG chat   (planned)
└─────────────────┘
```

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| Setup | Done | Repo structure, Supabase, GitHub Actions, API keys |
| Ingestion | Done | HN + RSS adapters, dedup, Postgres storage |
| Embeddings | Done | sentence-transformers, pgvector, semantic search RPC |
| Agent Reasoning | Planned | Function calling, classify / insight / selection |
| Digest + Email | Planned | HTML template, Resend, full orchestration |
| Reliability | Planned | Retry logic, pipeline_runs observability, alerting |
| Dashboard + RAG | Planned | Archive view, RAG chat with citations |
| Polish | Planned | End-to-end tests, demo |

## Repository Layout

```
Skim/
├── pipeline/          # Python ingestion + embedding pipeline
│   ├── sources/       # Hacker News and RSS adapters
│   ├── ingest.py      # Daily ingestion orchestrator
│   ├── embed.py       # Embedding + similarity search
│   ├── db.py          # Postgres connection and queries
│   └── tests/         # pytest suite
├── dashboard/         # Next.js frontend
├── sql/               # Supabase schema and RPC functions
└── .github/workflows/ # GitHub Actions (digest.yml)
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- A Supabase project with `sql/schema.sql` applied

### Database setup

Run `sql/schema.sql` in the Supabase SQL editor. This creates the `articles`, `digests`, and `pipeline_runs` tables, enables pgvector, and adds the `search_similar_articles` RPC.

### Pipeline

```bash
git clone <repo-url>
cd Skim

cd pipeline
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env             # Fill in your keys

# Ingest articles from all sources
python -m pipeline.ingest

# Embed any articles missing embeddings
python -m pipeline.embed

# Run tests (integration tests need a live DB)
pytest
```

### Dashboard

```bash
cd dashboard
npm install
cp env.example .env.local       # Fill in Supabase URL + publishable key
npm run dev
```

### Environment variables

**Pipeline** (`pipeline/.env`):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
| `SUPABASE_SECRET_KEY` | Service role key |
| `SUPABASE_DB_URL` | Direct Postgres connection string |
| `GEMINI_API_KEYS` | Gemini API keys (primary), comma-separated to rotate on quota exhaustion |
| `GROQ_API_KEYS` | Groq fallback API keys, comma-separated |
| `RESEND_API_KEY` | Email delivery |
| `DIGEST_RECIPIENT` | Digest email address |

**Dashboard** (`dashboard/.env.local`):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key for client |

### GitHub Actions

Add the pipeline env vars as repository secrets. For `SUPABASE_DB_URL`, use the **Supavisor transaction pooler** (port 6543) from Supabase Dashboard → Connect — GitHub Actions runners are IPv4-only and cannot reach Supabase's direct `db.*.supabase.co` endpoint.

If your database password contains `@`, store it as-is in the secret; the pipeline URL-encodes it automatically.

## Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Vector DB | pgvector in Supabase | One database for relational + vector data, zero extra cost |
| Scheduler | GitHub Actions cron | Free, no server to maintain, built-in secrets |
| LLM output | Function calling | Typed JSON, no fragile text parsing |
| Architecture | Multi-pass agent | Focused steps with partial failure recovery |
| Embedding | Local MiniLM | Free at any volume, no rate limits |
| CI database | Supavisor pooler | IPv4-compatible; direct Supabase host is IPv6-only |

## License

MIT
