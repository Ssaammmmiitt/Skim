# Skim

> An agentic AI news digest pipeline that scrapes, reasons, and delivers curated tech news daily  -  with a RAG-powered dashboard for exploration.

**Production dashboard:** [https://skim-azure.vercel.app](https://skim-azure.vercel.app)

## What is Skim?

Skim is a fully automated system that:

1. **Ingests** tech news daily from Hacker News and RSS feeds (TechCrunch, Ars Technica, The Verge, MIT Technology Review)
2. **Embeds** articles locally with sentence-transformers for semantic search over the full corpus
3. **Reasons** over articles using LLMs with function calling (classify topics, score importance, generate editorial insights)
4. **Selects** the day's top stories through multi-pass agentic reasoning
5. **Delivers** a curated HTML email digest every morning via Mailtrap
6. **Serves** a web dashboard with hybrid search, RAG chat, archive, and per-user preferences  -  **Google OAuth** and **email OTP** with admin-approved access

All designed to run on free-tier infrastructure.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Pipeline | Python 3.11 | Scraping, NLP, embeddings |
| Dashboard | Next.js 16 + TypeScript + Tailwind v4 | Server components, API routes, responsive UI |
| Database | Supabase (PostgreSQL + pgvector) | Relational + vector in one DB |
| LLM | Gemini 3.6 Flash (primary) + Groq fallback | Structured function calling; Groq when Gemini keys are exhausted |
| Embeddings | all-MiniLM-L6-v2 (384-dim) | Local in pipeline; HF Inference API on Vercel for chat |
| Email | Mailtrap HTTP API | Sandbox for dev; verified-domain production sends |
| Scheduler | GitHub Actions cron | Free minutes, built-in secrets |
| Auth | Supabase Auth (Google OAuth + email OTP) | Signup approval workflow, RLS |
| Frontend hosting | Vercel | `dashboard/` deployed at skim-azure.vercel.app |

## What's Built

### Pipeline (Phases 0–5) ✅

**Ingestion**
- Source adapters for Hacker News and RSS feeds with graceful per-source failure handling
- URL normalization and deduplication (`ON CONFLICT DO NOTHING`)
- HTML stripped from RSS summaries, capped at 1,000 characters

**Embeddings**
- Local `all-MiniLM-L6-v2` embeddings over `title + summary`
- Idempotent `embed_new_articles()`  -  only processes rows with `NULL` embeddings
- HNSW index for vector search (ivfflat loses recall on small corpora)

**Agent reasoning**
- Three-pass LLM pipeline: classify → insight → story selection
- `gemini-3.6-flash` primary with Gemini fallbacks on high demand, then Groq `openai/gpt-oss-120b`
- Multi-key rotation across 5 Gemini + 2 Groq keys; parallel insights for CI speed

**Digest + email**
- Jinja2 HTML templates: classic, cyan (Skim default), minimal
- Per-subscriber theme, format, topic filters, max stories
- Full orchestrator (`python -m pipeline.main`) with digest idempotency

**Reliability**
- Retry utility, failure alerts, graceful degradation, structured logging, health check
- GitHub Actions test workflow (`pytest -m "not integration"`)

### Dashboard (Phase 6) ✅

**Auth & admin**
- Google sign-up/sign-in + email OTP (sign up / sign in tabs)
- Wait page (`/pending`) until admin approves in `/admin`
- Superuser auto-approved; signup alert emails via Mailtrap

**Pages**
- `/`  -  today's digest feed
- `/archive`  -  past digests with date picker
- `/search`  -  hybrid semantic + keyword search
- `/chat`  -  RAG Q&A with cited sources (20 queries/day)
- `/settings`  -  email + dashboard preferences, live email preview
- `/admin`  -  pending user approval queue

**Hybrid RAG**
- MiniLM query embeddings + pgvector + Postgres FTS + RRF fusion
- Multi-provider answer generation (Gemini key rotation → fallback models → Groq)
- Structured chat errors with retry UI

**UI**
- Cyan Skim design system (dark default, light/dark/system toggle)
- Tailwind CSS v4 + shared `tailwind-ui.ts` utilities
- Responsive nav (mobile drawer, tablet strip, desktop centered)
- Error boundaries, loading skeletons, chat overflow fix

**Deployment**
- Live on Vercel: [skim-azure.vercel.app](https://skim-azure.vercel.app)
- See [`docs/vercel-deploy.md`](docs/vercel-deploy.md)

**Tests**
- 148+ pipeline pytest tests; 81 dashboard Vitest tests (229+ total)

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
│ 2. Dedup/Store  │  Postgres (Supabase)  -  articles table
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. Embed        │  sentence-transformers → pgvector
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4. Agent Reason │  Gemini 3.6 Flash + Groq function calling
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. Compose+Send │  Jinja2 HTML → Mailtrap email
└────────┬────────┘
         ▼
┌─────────────────┐
│ 6. Dashboard    │  Next.js on Vercel  -  browse, search, RAG chat
└─────────────────┘
```

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| Setup | ✅ Done | Repo structure, Supabase, GitHub Actions, API keys |
| Ingestion | ✅ Done | HN + RSS adapters, dedup, Postgres storage |
| Embeddings | ✅ Done | sentence-transformers, pgvector, HNSW index |
| Agent Reasoning | ✅ Done | Function calling, classify / insight / selection, key rotation |
| Digest + Email | ✅ Done | HTML templates, Mailtrap, per-user themes |
| Reliability | ✅ Done | Retry, health check, alerts, CI tests |
| Auth + Admin | ✅ Done | Google OAuth, email OTP, approval workflow  -  [setup guide](docs/phase6_auth_admin_preferences.md) |
| Dashboard + RAG | ✅ Done | All pages, hybrid search/chat, themes, Vercel deploy |
| Go Live | 📋 Next | Onboard users, demo, 14-day uptime |

**Full progress report:** [`progress.md`](progress.md)  
**Internal bug log:** [`docs/report.md`](docs/report.md)

## Repository Layout

```
Skim/
├── pipeline/          # Python ingestion + embedding + agent pipeline
│   ├── sources/       # Hacker News and RSS adapters
│   ├── agent/         # LLM client, prompts, reasoning orchestrator
│   ├── main.py        # Full daily orchestrator
│   └── tests/         # pytest suite (148+ tests)
├── dashboard/         # Next.js app (deployed to Vercel)
│   ├── src/           # App router, components, lib, styles
│   ├── vercel.json    # API timeout, region config
│   └── Design.md      # Skim cyan design system
├── sql/               # Migrations 001–006 (schema through dashboard theme)
├── docs/              # Deploy guide, phase 6 setup, internal report
├── progress.md        # Complete serial progress report
└── .github/workflows/ # digest.yml (daily), test.yml (CI)
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- A Supabase project

### Database setup

Run in the Supabase SQL editor **in this order**:

1. `sql/schema.sql`
2. `sql/002_users_auth_preferences.sql`
3. `sql/003_fix_profiles_rls.sql`
4. `sql/004_search_fts.sql`
5. `sql/005_hybrid_search.sql`
6. `sql/006_dashboard_theme.sql`

**Full auth checklist:** [`docs/phase6_auth_admin_preferences.md`](docs/phase6_auth_admin_preferences.md)

### Pipeline

```bash
cd pipeline
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp env.example .env    # Fill in keys
python -m pipeline.main
pytest -m "not integration"
```

### Dashboard (local)

```bash
cd dashboard
npm install
cp .env.example .env.local
npm run dev
```

Visit `/login`  -  Google or email sign-up/sign-in.

### Dashboard (Vercel)

See [`docs/vercel-deploy.md`](docs/vercel-deploy.md). Required for chat on production:

- `GEMINI_API_KEYS`, `GROQ_API_KEYS`
- `HF_TOKEN` (query embeddings on Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`

### Environment variables

**Pipeline** (`pipeline/.env`): `SUPABASE_*`, `GEMINI_API_KEYS`, `GROQ_API_KEYS`, `HF_TOKEN`, `MAILTRAP_*`, `DIGEST_RECIPIENT`, `SKIM_SUPERUSER_EMAIL`

**Dashboard** (`dashboard/.env.local`): `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SECRET_KEY`, `SKIM_SUPERUSER_EMAIL`, `SKIM_ADMIN_CONTACT_EMAIL`, `GEMINI_API_KEYS`, `GROQ_API_KEYS`, `HF_TOKEN` (for Vercel chat)

See `pipeline/env.example` and `dashboard/.env.example` for full tables.

### GitHub Actions

Add pipeline env vars as repository secrets. Use **Supavisor pooler** (port 6543) for `SUPABASE_DB_URL`  -  GitHub runners are IPv4-only.

## Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Vector DB | pgvector in Supabase | One database for relational + vector data |
| Scheduler | GitHub Actions cron | Free, no server to maintain |
| LLM output | Function calling | Typed JSON, no fragile text parsing |
| LLM provider | Gemini primary, Groq fallback | Free tier + multi-key rotation |
| Embedding | Local MiniLM (384-dim) | Same space for pipeline + dashboard RAG |
| Vercel embeddings | HF Inference API | `@xenova/transformers` unreliable on serverless |
| Email | Mailtrap API | Sandbox for dev; production sends in CI |
| Auth | Supabase + approval workflow | Admin gate before public access |
| UI | Cyan Tailwind tokens | Responsive, dark-default, no static CSS classes |

## License

MIT
