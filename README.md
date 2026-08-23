# Skim

> An agentic AI news digest pipeline that scrapes, reasons, and delivers curated tech news daily — with a RAG-powered dashboard for exploration.

## What is Skim?

Skim is a fully automated system that:
1. **Scrapes** tech/AI news daily from 5+ free sources (Hacker News, TechCrunch, Ars Technica, The Verge, arXiv)
2. **Reasons** over articles using LLMs with function calling (classifies topics, scores importance, generates editorial insights)
3. **Selects** the day's top stories through multi-pass agentic reasoning
4. **Delivers** a curated HTML email digest every morning
5. **Serves** a web dashboard with archive browsing and RAG-powered chat ("What happened in AI this week?")

All running on free-tier infrastructure with zero cost.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Pipeline | Python 3.11 | Best ecosystem for scraping, NLP, embeddings |
| Dashboard | Next.js 14 + TypeScript | Industry standard, server components, API routes |
| Database | Supabase (PostgreSQL + pgvector) | Free tier, relational + vector in one DB |
| LLM | Groq (Llama 3.3 70B) + Gemini Flash fallback | Free tier, function calling support |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Runs locally, zero API cost |
| Email | Resend | 3,000 emails/month free |
| Scheduler | GitHub Actions cron | Free 2,000 min/month |
| Frontend hosting | Vercel | Free hobby tier, auto-deploy |

## Features

- Automated daily ingestion from 5+ sources with deduplication
- LLM-powered classification via function calling (topic + importance scoring)
- Multi-pass agentic reasoning (classify → generate insights → holistic selection)
- Dual-LLM failover (Groq primary, Gemini fallback)
- Idempotent pipeline (safe to re-run, no duplicate emails)
- Graceful degradation (broken sources don't crash the run)
- Semantic vector search over accumulated corpus
- RAG chat with source citations
- Pipeline observability (stats table + failure alerts)
- Zero infrastructure cost

## Architecture

```
GitHub Actions (cron, daily 6:00 AM NPT)
        │
        ▼
┌─────────────────┐
│ 1. Ingestion    │  RSS feeds + Hacker News API
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
│ 4. Agent Reason │  Groq/Gemini function calling:
│                 │   classify → generate insight → select top stories
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. Compose+Send │  Jinja2 HTML template → Resend email
└────────┬────────┘
         ▼
┌─────────────────┐
│ 6. Dashboard    │  Next.js + Vercel — browse archive, RAG chat
│  (reads same DB)│
└─────────────────┘
```

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0: Setup | Not Started | Repo structure, Supabase, GH Actions skeleton, API keys |
| Phase 1: Ingestion | Not Started | Source adapters (HN, RSS), dedup, Postgres storage |
| Phase 2: Embedding | Not Started | sentence-transformers, pgvector, semantic search |
| Phase 3: Agent Reasoning | Not Started | Function calling, 3-pass classification/insight/selection |
| Phase 4: Digest + Email | Not Started | HTML template, Resend, pipeline orchestration |
| Phase 5: Reliability | Not Started | Cron scheduling, retry logic, monitoring, alerting |
| Phase 6: Dashboard + RAG | Not Started | Next.js, archive view, RAG chat with citations |
| Phase 7: Polish | Not Started | Documentation, tests, demo recording |

**Overall Progress: 0/8 phases complete**

## Quick Start

```bash
# Clone the repo
git clone <repo-url>
cd Skim

# Backend pipeline
cd pipeline
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys
python -m pipeline.main

# Frontend dashboard
cd ../dashboard
npm install
cp .env.example .env.local  # Fill in your keys
npm run dev
```

## Documentation

- [Development Plan](docs/DEVELOPMENT_PLAN.md) — Detailed phase-by-phase build plan with all tasks
- [Architecture](docs/architecture.md) — System diagrams, data flow, decision log (coming soon)

## Design Decisions

| Decision | Choice | Alternative Considered | Reasoning |
|----------|--------|----------------------|-----------|
| Vector DB | pgvector (in Supabase) | Pinecone, Weaviate | Zero cost, one fewer service, vectors + relational in one DB |
| Scheduler | GitHub Actions cron | Dedicated server, Railway | Zero cost, zero maintenance, built-in secrets |
| LLM output | Function calling | Free-form text parsing | Typed JSON guaranteed, no regex parsing needed |
| Architecture | Multi-pass agent | Single mega-prompt | Each step focused, real dependency chain, partial failure recovery |
| Embedding | Local model (MiniLM) | OpenAI/Cohere API | Completely free at any volume, no rate limits |

## Future Work

- Personalized ranking via user feedback loop
- Multi-user support with preference profiles
- Real-time breaking news alerts
- Fine-tuned classification model replacing LLM calls
- RSS source auto-discovery
- Weekly/monthly trend analysis

## License

MIT
