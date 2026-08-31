# Skim

**Automated tech news digest with agentic reasoning and a RAG-powered dashboard.**

Skim ingests Hacker News and major tech RSS feeds daily, embeds articles for semantic search, runs a multi-pass LLM agent to classify and curate stories, emails personalized HTML digests, and exposes a web dashboard for browsing, hybrid search, and cited Q&A over the full corpus.

[![Production](https://img.shields.io/badge/dashboard-live-06b6d4?style=flat-square)](https://skim-azure.vercel.app)
[![Python](https://img.shields.io/badge/python-3.11-blue?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/supabase-postgres%20%2B%20pgvector-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

**Live dashboard:** [skim-azure.vercel.app](https://skim-azure.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Design Decisions](#design-decisions)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [API Overview](#api-overview)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Future Work](#future-work)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Pipeline (automated daily)

| Capability | Details |
|------------|---------|
| **Ingestion** | Hacker News + TechCrunch, Ars Technica, The Verge, MIT Tech Review |
| **Deduplication** | URL normalization, `ON CONFLICT DO NOTHING` |
| **Embeddings** | `all-MiniLM-L6-v2` (384-dim) over title + summary, stored in pgvector |
| **Agent reasoning** | 3-pass LLM: classify → insight → story selection (function calling) |
| **Email digests** | Jinja2 HTML (classic / cyan / minimal), per-user theme and topic filters |
| **Reliability** | Retry with backoff, graceful degradation, failure alerts, health checks |
| **Scheduler** | GitHub Actions cron at 00:15 UTC daily |

### Dashboard (web app)

| Capability | Details |
|------------|---------|
| **Auth** | Google OAuth + email OTP; invite-by-approval workflow |
| **Digest feed** | Today's stories with agent insights and topic badges |
| **Archive** | Browse past digests by date |
| **Hybrid search** | Semantic (pgvector) + full-text (Postgres FTS) fused with RRF |
| **RAG chat** | Cited answers over the corpus; Gemini with Groq fallback (20 queries/day) |
| **Settings** | Email theme/format, dashboard light/dark/system, live preview |
| **Admin** | Approve or reject pending signups |
| **UX polish** | Per-route loading skeletons, error alerts with retry, empty states |

---

## Architecture

```mermaid
flowchart TB
  subgraph cron [GitHub Actions — daily 00:15 UTC]
    ingest[Ingest HN + RSS]
    embed[Embed MiniLM 384-dim]
    agent[3-pass LLM agent]
    compose[Compose HTML digest]
    email[Mailtrap email]
    ingest --> embed --> agent --> compose --> email
  end

  subgraph db [Supabase Postgres]
    articles[(articles + pgvector)]
    digests[(digests)]
    profiles[(profiles + RLS)]
    chat_usage[(chat_usage)]
  end

  subgraph dash [Next.js Dashboard — Vercel]
    pages[Pages: / /archive /search /chat /settings /admin]
    api[API routes]
    pages --> api
  end

  cron --> db
  db --> api
  api --> pages

  subgraph rag [RAG path — search & chat]
    qembed[Query embedding]
    vec[Vector search]
    fts[Full-text search]
    rrf[RRF fusion]
    llm[Gemini → Groq answer]
    qembed --> vec --> rrf
    qembed --> fts --> rrf
    rrf --> llm
  end

  api --> rag
```

**Daily loop:** cron ingests and reasons over news → stores articles + embeddings → emails personalized digests → dashboard reads the same corpus for browse, hybrid search, and cited chat.

**RAG flow:** embed query (MiniLM locally / HF API on Vercel) → vector + FTS retrieval → reciprocal rank fusion (k=60) → (chat only) multi-provider LLM with numbered citations.

See [`docs/rag.md`](docs/rag.md) for retrieval and generation details.

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Pipeline | Python 3.11, pytest, sentence-transformers | Mature scraping/ML ecosystem; local embeddings avoid API cost at ingest scale |
| Agent / LLM | Google Gemini 3.6 Flash, Groq `openai/gpt-oss-120b` | Generous free tiers; Groq is last-resort failover when Gemini quotas hit |
| Database | Supabase (PostgreSQL + pgvector + RLS) | One system for relational data, vectors, and auth — no separate vector DB bill |
| Embeddings | `all-MiniLM-L6-v2` (384-dim) | Same vector space in pipeline and dashboard; HF Inference API on Vercel serverless |
| Email | Mailtrap HTTP API | Sandbox for dev; verified domain for production sends |
| Dashboard | Next.js 16, React 19, TypeScript, Tailwind v4, Zustand | App Router + server components for auth/data; Zustand for client chat/search state |
| Auth | Supabase Auth (Google OAuth, email OTP) | Managed OAuth + magic links; RLS ties access to `profiles.status` |
| CI / CD | GitHub Actions (pipeline cron + `test.yml`) | Free scheduling with no server to maintain; tests gate every PR |
| Hosting | Vercel (`dashboard/`) | Hobby tier auto-deploy; pipeline stays on Actions, not serverless |

Designed to run primarily on **free-tier** infrastructure.

---

## Design Decisions

Five trade-offs that shape how Skim is built and operated:

### 1. pgvector in Postgres vs. a dedicated vector database

**Choice:** Store embeddings in Supabase Postgres with an HNSW index.

**Alternatives:** Pinecone, Weaviate, or a separate vector service.

**Why:** Articles, digests, user profiles, and vectors live in one place. Hybrid search (vector + full-text) runs in SQL via RPCs. Zero extra monthly cost and simpler ops for a ~10-user deployment.

### 2. Local MiniLM vs. cloud embedding APIs

**Choice:** `all-MiniLM-L6-v2` in the pipeline; same model for RAG queries (HF API on Vercel where local inference is unreliable).

**Alternatives:** OpenAI `text-embedding-3-small`, Cohere, or Gemini embeddings.

**Why:** Ingestion embeds hundreds of articles daily — local inference is free at any volume. Keeping 384-dim MiniLM end-to-end avoids mixing embedding spaces.

### 3. Multi-pass agent vs. single LLM call

**Choice:** Three passes — classify all → generate insights for top candidates → holistically select and order stories.

**Alternatives:** One-shot “pick top 8 stories” prompt.

**Why:** Separating classification, insight generation, and selection improves digest quality and makes each step testable. Function-calling returns structured JSON, not free-form prose.

### 4. GitHub Actions cron vs. always-on server

**Choice:** Daily pipeline on GitHub Actions; dashboard on Vercel.

**Alternatives:** Railway/Fly cron, AWS Lambda, or a VPS running `cron`.

**Why:** No server to patch or pay for when idle. The pipeline is batch-oriented (once per day); the dashboard is the only always-on surface.

### 5. Invite-by-approval auth vs. open signup

**Choice:** Google OAuth + email OTP with admin approval; ~10 member cap.

**Alternatives:** Open registration or invite-only magic links without an admin queue.

**Why:** Controls Gemini/Groq/Mailtrap quotas on free tiers, keeps the digest list intentional, and demonstrates a realistic B2B-style access pattern (RLS + `profiles.status`).

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 20+ |
| npm | 10+ (comes with Node 20) |
| Supabase | Project with SQL migrations applied |
| API keys | Gemini, Groq (optional fallback), Mailtrap, Hugging Face token |

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd Skim
```

### 2. Database setup

Run these files in the **Supabase SQL Editor**, in order:

| # | File | Purpose |
|---|------|---------|
| 1 | `sql/schema.sql` | Articles, digests, pgvector, HNSW index |
| 2 | `sql/002_users_auth_preferences.sql` | Profiles, auth, preferences, RLS |
| 3 | `sql/003_fix_profiles_rls.sql` | Admin RLS fix (if 002 already applied) |
| 4 | `sql/004_search_fts.sql` | Full-text search column |
| 5 | `sql/005_hybrid_search.sql` | Hybrid RAG RPCs (vector + FTS + RRF) |
| 6 | `sql/006_dashboard_theme.sql` | Dashboard theme preference column |

Then configure Supabase Auth (Google OAuth + email OTP) and redirect URLs. Full checklist: [`docs/phase6_auth_admin_preferences.md`](docs/phase6_auth_admin_preferences.md).

### 3. Pipeline (local)

```bash
cd pipeline
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env               # fill in your keys
python -m pipeline.main             # full daily run
```

Individual stages:

```bash
python -m pipeline.ingest
python -m pipeline.embed
python -m pipeline.agent.reasoning
```

### 4. Dashboard (local)

```bash
cd dashboard
npm install
cp .env.example .env.local        # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign in at `/login`.

Superuser email (`SKIM_SUPERUSER_EMAIL`) is auto-approved and sees the Admin panel.

---

## Configuration

### Pipeline (`pipeline/.env`)

Copy from `pipeline/env.example`.

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Anon/publishable key |
| `SUPABASE_SECRET_KEY` | Yes | Service role key |
| `SUPABASE_DB_URL` | Yes | Postgres connection string (pooler port 6543 for CI) |
| `GEMINI_API_KEYS` | Yes | Comma-separated; one key per Google Cloud project |
| `GROQ_API_KEYS` | Recommended | Fallback when Gemini quota is exhausted |
| `HF_TOKEN` | Recommended | Faster embedding model downloads |
| `MAILTRAP_API_TOKEN` | Yes | Email delivery |
| `MAILTRAP_SENDER_EMAIL` | Yes | Verified sender domain |
| `DIGEST_RECIPIENT` | Yes | Fallback recipient if no subscribers |
| `SKIM_SUPERUSER_EMAIL` | Yes | Auto-approved admin email |

Optional: `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`, `LOG_LEVEL`, `MAILTRAP_SANDBOX`.

### Dashboard (`dashboard/.env.local`)

Copy from `dashboard/.env.example`.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Anon key for client |
| `SUPABASE_SECRET_KEY` | Yes | Service role (profile sync, chat usage) |
| `SKIM_SUPERUSER_EMAIL` | Yes | Auto-approved superuser |
| `SKIM_ADMIN_CONTACT_EMAIL` | Yes | Wait page contact + signup alerts |
| `GEMINI_API_KEYS` | For chat | Answer generation |
| `GROQ_API_KEYS` | For chat | LLM fallback |
| `HF_TOKEN` | Vercel chat | Query embeddings on serverless |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public URL for email links |

> **Note:** Pipeline uses `SUPABASE_URL`; dashboard uses `NEXT_PUBLIC_SUPABASE_URL`. Same project, different env var names.

### GitHub Actions secrets

Required for the daily digest workflow (`.github/workflows/digest.yml`):

`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS_URL`, `GEMINI_API_KEYS`, `GROQ_API_KEYS`, `HF_TOKEN`, `MAILTRAP_API_TOKEN`, `MAILTRAP_SENDER_EMAIL`, `DIGEST_RECIPIENT`

Use the **Supavisor transaction pooler** (port **6543**) for `SUPABASE_DB_URL`  -  GitHub Actions runners are IPv4-only.

---

## Running Tests

### Pipeline (pytest)

```bash
cd pipeline
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest -m "not integration"       # unit tests only (161)
pytest                            # includes integration tests (needs live DB + API keys)
```

### Dashboard (Vitest)

```bash
cd dashboard
npm test                            # 91 tests
npm run test:watch
npm run build                       # production build + TypeScript check
npm run lint
```

**CI:** `.github/workflows/test.yml` runs pipeline unit tests (Python 3.11) and dashboard Vitest on every push to `main` and on pull requests.

**Total automated tests:** 161 pipeline + 91 dashboard = **252** (integration tests excluded in CI).

---

## Deployment

| Component | Where | Guide |
|-----------|-------|-------|
| **Pipeline** | GitHub Actions | Secrets in repo settings; cron in `digest.yml` |
| **Dashboard** | Vercel | [`docs/vercel-deploy.md`](docs/vercel-deploy.md) |

**Vercel checklist (summary):**

1. Set root directory to `dashboard`
2. Add all dashboard env vars (especially `HF_TOKEN` + `GEMINI_API_KEYS` for chat)
3. Add Supabase redirect URLs for your Vercel domain
4. Smoke test `/`, `/search?q=AI`, `/chat`

Pipeline is **not** deployed to Vercel  -  it runs on GitHub Actions only.

---

## API Overview

All routes require an **active** authenticated user (`profiles.status = active`).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/digests` | GET | Digest articles (`?date=YYYY-MM-DD`) |
| `/api/digests/dates` | GET | Available archive dates |
| `/api/search` | GET | Hybrid search (`?q=`, `?mode=hybrid\|keyword`) |
| `/api/chat` | GET | Chat quota (`limit`, `used`, `remaining`) |
| `/api/chat` | POST | RAG Q&A (`{ message, history? }`) |
| `/api/settings/preferences` | GET/PUT | User preferences |
| `/api/settings/digest-preview` | GET | Email HTML preview |
| `/api/admin/users` | GET/POST | Pending user queue (admin) |

Full API details: [`dashboard/README.md`](dashboard/README.md) · Dashboard architecture: [`docs/dashboard.md`](docs/dashboard.md) · RAG internals: [`docs/rag.md`](docs/rag.md)

---

## Project Structure

```
Skim/
├── pipeline/                 # Python daily pipeline
│   ├── agent/                # LLM client, prompts, reasoning
│   ├── sources/              # Hacker News + RSS adapters
│   ├── templates/            # Email HTML (classic, cyan, minimal)
│   ├── main.py               # Orchestrator entry point
│   ├── ingest.py             # Multi-source ingestion
│   ├── embed.py              # MiniLM embeddings → pgvector
│   ├── compose.py            # Jinja2 digest rendering
│   ├── email_sender.py       # Mailtrap delivery
│   └── tests/                # pytest suite
│
├── dashboard/                # Next.js web app (Vercel)
│   ├── src/
│   │   ├── app/              # App Router pages + API routes
│   │   ├── components/       # UI (layout, chat, digest, search, …)
│   │   └── lib/              # Retrieval, chat, auth, Supabase clients
│   ├── vercel.json
│   └── Design.md             # Cyan design system
│
├── sql/                      # Supabase migrations (001–006)
├── docs/                     # Guides and technical references
│   ├── rag.md                # RAG architecture deep dive
│   ├── dashboard.md          # Next.js dashboard architecture & Zustand
│   ├── vercel-deploy.md      # Production deploy checklist
│   ├── phase6_auth_admin_preferences.md
│   └── report.md             # Internal build log
│
├── .github/workflows/
│   ├── digest.yml            # Daily pipeline cron
│   └── test.yml              # CI unit tests
│
└── progress.md               # Full serial progress report
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [`progress.md`](progress.md) | Complete build history, file inventory, API reference |
| [`docs/rag.md`](docs/rag.md) | Hybrid retrieval, embeddings, DB search, chat flow |
| [`docs/dashboard.md`](docs/dashboard.md) | Next.js architecture, Zustand stores, component call chains |
| [`docs/vercel-deploy.md`](docs/vercel-deploy.md) | Vercel setup, env vars, smoke tests |
| [`docs/phase6_auth_admin_preferences.md`](docs/phase6_auth_admin_preferences.md) | Auth flows, Supabase config, approval workflow |
| [`dashboard/README.md`](dashboard/README.md) | Dashboard setup, pages, API, design |
| [`dashboard/Design.md`](dashboard/Design.md) | UI design system (cyan theme) |
| [`docs/report.md`](docs/report.md) | Internal bug log and LLM configuration notes |

---

## Future Work

| Item | Priority | Notes |
|------|----------|-------|
| **User onboarding** | P0 | Invite ~10 users; monitor Gemini/Groq/Mailtrap quotas |
| **Agent eval dataset (7.3)** | P1 | 20-article labeled set; topic/importance accuracy benchmarks |
| **`docs/architecture.md` (7.7)** | P2 | ER diagram, pipeline sequence, extended decision log |
| **Demo video (7.8)** | P2 | 2–3 min walkthrough for README link |
| **14-day uptime (7.9)** | P2 | Query `pipeline_runs` for consecutive successes |
| **Additional news sources** | P3 | arXiv, more RSS feeds; adapter pattern in `pipeline/sources/` |
| **Remove `embed_gemini.py`** | P3 | Experimental 768-dim path; RAG uses MiniLM only |

### Phase 7 progress

| Task | Status | Summary |
|------|--------|---------|
| 7.1 Pipeline cleanup | ✅ | black/isort, type hints, dead code removal |
| 7.2 Unit tests | ✅ | Idempotency, dedup, compose coverage |
| 7.3 Agent eval dataset | 🔲 | Not started |
| 7.4 Dashboard cleanup | ✅ | ESLint clean; server/client splits; no `any` types |
| 7.5 Loading & error states | ✅ | Skeletons, `ErrorAlert` + retry on all interactive pages |
| 7.6 README | ✅ | This document |
| 7.7 Architecture docs | 🔲 | `docs/architecture.md` |
| 7.8 Demo video | 🔲 | 2–3 min walkthrough |
| 7.9 14-day uptime | 🔲 | Query `pipeline_runs` for consecutive successes |
| 7.10 Production verification | 🔲 | Full smoke test on Vercel + latest email |

---

## Contributing

Contributions are welcome. Suggested workflow:

1. Fork the repository and create a feature branch from `main`
2. Make changes with tests where applicable
3. Run `pytest -m "not integration"` and `cd dashboard && npm test`
4. Open a pull request with a clear description of what changed and why

For large changes (new sources, retrieval strategy, auth model), open an issue first to discuss approach.

---

## License

MIT
