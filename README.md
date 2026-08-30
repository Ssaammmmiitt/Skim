# Skim

> An agentic AI news digest pipeline that scrapes, reasons, and delivers curated tech news daily — with a RAG-powered dashboard for exploration.

## What is Skim?

Skim is a fully automated system that:

1. **Ingests** tech news daily from Hacker News and RSS feeds (TechCrunch, Ars Technica, The Verge, MIT Technology Review)
2. **Embeds** articles locally with sentence-transformers for semantic search over the full corpus
3. **Reasons** over articles using LLMs with function calling (classify topics, score importance, generate editorial insights)
4. **Selects** the day's top stories through multi-pass agentic reasoning
5. **Delivers** a curated HTML email digest every morning via Mailtrap
6. **Serves** a web dashboard (archive + RAG chat) with **Google OAuth** and **email OTP signup**, admin-approved access, and per-user digest preferences

All designed to run on free-tier infrastructure.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Pipeline | Python 3.11 | Scraping, NLP, embeddings |
| Dashboard | Next.js 16 + TypeScript | Server components, API routes |
| Database | Supabase (PostgreSQL + pgvector) | Relational + vector in one DB |
| LLM | Gemini 3.6 Flash (primary) + Groq fallback | Structured function calling; Groq when Gemini keys are exhausted |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Local, zero API cost |
| Email | Mailtrap HTTP API | Sandbox for dev; verified-domain production sends |
| Scheduler | GitHub Actions cron | Free minutes, built-in secrets |
| Auth | Supabase Auth (Google OAuth + email OTP) | Signup approval workflow, RLS |
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

**Agent reasoning**
- Three-pass LLM pipeline: classify → insight → story selection
- `gemini-3.6-flash` primary with ordered Gemini fallbacks (`gemini-2.0-flash`, `gemini-3.5-flash-lite`) on high demand, then Groq `openai/gpt-oss-120b`
- Multi-key rotation: comma-separated `GEMINI_API_KEYS` / `GROQ_API_KEYS` (5 Gemini + 2 Groq)
- Rotates on quota (429), invalid key (403), or unavailable model (404); skips Gemini for the rest of the run once all keys fail
- Partial progress on provider failure — bad LLM responses are skipped, not fatal

**Digest + email**
- Jinja2 HTML templates: classic, cyan (Skim dark), minimal
- Per-subscriber theme, format (full/brief/headlines), topic filters, max stories
- Mailtrap REST API delivery with sandbox mode for local dev
- Full pipeline orchestrator (`python -m pipeline.main`) with digest idempotency via `digests` table
- `pipeline_runs` logging for each execution

**Dashboard (Phase 6)**
- Google sign-up/sign-in (name, email, avatar from Google profile)
- Email **sign-up** via registration OTP; email **sign-in** via login OTP for approved users
- Wait page (`/pending`) with **contact admin** mailto until approved
- Admin signup notification email + `/admin` approval queue (superuser)
- Settings page for digest theme/format preferences
- Auth middleware — no access to app or APIs until `profiles.status = active`
- `GET /api/digests` — digest articles by date (Phase 6B.1)

**Reliability (Phase 5)**
- Retry utility, failure alerts, graceful degradation, structured logging, health check
- GitHub Actions test workflow (`pytest -m "not integration"`)

**Infrastructure**
- Supabase schema: `articles`, `digests`, `pipeline_runs`, `profiles`, preferences
- GitHub Actions workflow (daily cron + manual trigger) with sentence-transformers model caching
- Next.js 16 dashboard with Supabase SSR auth

**Tests**
- 148+ pytest unit tests; integration tests for live DB/API

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
│ 4. Agent Reason │  Gemini 3.6 Flash + Groq function calling
│                 │   classify → insight → selection
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. Compose+Send │  Jinja2 HTML → Mailtrap email
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
| Agent Reasoning | Done | Function calling, classify / insight / selection, key rotation |
| Digest + Email | Done | HTML templates, Mailtrap, per-user themes, orchestration |
| Reliability | Done | Retry, health check, alerts, CI tests |
| **Auth + Admin** | **Done** | Google OAuth, email OTP signup, approval workflow — [setup guide](docs/phase6_auth_admin_preferences.md) |
| Dashboard + RAG | **In progress** | Home, archive, RAG chat UI; search API |
| Polish | Planned | Onboard ~10 users, demo |

## Repository Layout

```
Skim/
├── pipeline/          # Python ingestion + embedding pipeline
│   ├── sources/       # Hacker News and RSS adapters
│   ├── agent/         # LLM client, prompts, reasoning orchestrator
│   ├── ingest.py      # Daily ingestion orchestrator
│   ├── embed.py       # Embedding + similarity search
│   ├── db.py          # Postgres connection and queries
│   ├── compose.py     # Jinja2 HTML digest composition
│   ├── email_sender.py # Mailtrap email delivery
│   ├── resilience.py  # Exponential backoff retry utility
│   ├── alert_failure.py # CI failure alert email
│   ├── degradation.py # Graceful fallback when LLM reasoning fails
│   ├── main.py        # Full pipeline orchestrator
│   ├── templates/     # Email HTML templates
│   └── tests/         # pytest suite
├── dashboard/         # Next.js frontend (auth, admin, settings)
├── sql/               # Supabase schema + auth migration
├── docs/              # phase6_auth_admin_preferences.md — read before DB auth setup
└── .github/workflows/ # digest.yml, test.yml
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- A Supabase project with `sql/schema.sql` applied

### Database setup

Run in the Supabase SQL editor **in this order**:

1. `sql/schema.sql` — articles, digests, pgvector, `search_similar_articles` RPC
2. `sql/002_users_auth_preferences.sql` — profiles, approval workflow, digest preferences, RLS

Then configure Supabase Auth (Google + Email OTP) and dashboard env vars. **Full checklist:** [`docs/phase6_auth_admin_preferences.md`](docs/phase6_auth_admin_preferences.md)

### Pipeline

```bash
git clone <repo-url>
cd Skim

cd pipeline
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env             # Fill in your keys

# Run the full daily pipeline (ingest → embed → reason → email)
python -m pipeline.main

# Or run individual stages:
python -m pipeline.ingest
python -m pipeline.embed
python -m pipeline.agent.reasoning

# Run tests (integration tests need a live DB)
pytest
```

### Dashboard

See [`dashboard/README.md`](dashboard/README.md) for auth-specific setup.

```bash
cd dashboard
npm install
cp .env.example .env.local       # Supabase keys + SKIM_SUPERUSER_EMAIL + SKIM_ADMIN_CONTACT_EMAIL
npm run dev
```

Visit `/login` — Google or email sign-up/sign-in. New users land on `/pending` until the superuser approves them in `/admin`.

### Environment variables

**Pipeline** (`pipeline/.env`):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
| `SUPABASE_SECRET_KEY` | Service role key |
| `SUPABASE_DB_URL` | Direct Postgres connection string |
| `GEMINI_API_KEYS` | Gemini API keys (primary), comma-separated — one key per Google Cloud project for separate free-tier quota |
| `GROQ_API_KEYS` | Groq fallback API keys, comma-separated — used when all Gemini keys are exhausted |
| `HF_TOKEN` | Hugging Face token for faster embedding model downloads (optional but recommended) |
| `GEMINI_FALLBACK_MODELS` | Comma-separated Gemini fallbacks on high demand (default: `gemini-2.0-flash,gemini-3.5-flash-lite`) |
| `GEMINI_FALLBACK_MODEL` | Legacy single-fallback override (optional if `GEMINI_FALLBACK_MODELS` is set) |
| `GEMINI_HIGH_DEMAND_THRESHOLD` | Consecutive 503/504 errors before switching to fallback models (default: `3`) |
| `GEMINI_MODEL_RECOVERY_SECONDS` | Seconds before retrying primary model after switching to fallback (default: `60`) |
| `LOG_LEVEL` | Pipeline log verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`) |
| `MAILTRAP_API_TOKEN` | Mailtrap API token |
| `MAILTRAP_SENDER_EMAIL` | Verified sender address (production) |
| `MAILTRAP_SENDER_NAME` | Sender display name (default: Skim) |
| `MAILTRAP_SANDBOX` | Set `true` locally to capture emails in Mailtrap sandbox |
| `MAILTRAP_INBOX_ID` | Sandbox inbox ID (required when `MAILTRAP_SANDBOX=true`) |
| `DIGEST_RECIPIENT` | Fallback digest recipient when `digest_subscribers` table is empty |
| `SKIM_SUPERUSER_EMAIL` | Superuser email (also set in dashboard env) |

**Dashboard** (`dashboard/.env.local`):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key for client |
| `SKIM_SUPERUSER_EMAIL` | Your email — auto-approved, Admin access |
| `SKIM_ADMIN_CONTACT_EMAIL` | Wait-page contact + signup alert recipient |
| `NEXT_PUBLIC_SITE_URL` | Public URL (links in admin alert emails) |
| `MAILTRAP_API_TOKEN` | Optional — sends admin email on new signup |
| `MAILTRAP_SENDER_EMAIL` | Verified sender for admin alerts |

### GitHub Actions

Add the pipeline env vars as repository secrets. For `GEMINI_API_KEYS`, paste all keys comma-separated in a single secret (e.g. `key1,key2,key3,key4,key5`). Keys must come from separate Google Cloud projects — free-tier quota is per project, not per key.

Also add `HF_TOKEN` (Hugging Face read token) for faster embedding model downloads in CI.

`GEMINI_FALLBACK_MODELS`, `GEMINI_HIGH_DEMAND_THRESHOLD`, and `GEMINI_MODEL_RECOVERY_SECONDS` are set directly in the workflow (no secrets needed). Fallback models default to `gemini-2.0-flash,gemini-3.5-flash-lite` — avoid `gemini-2.5-flash`, which returns 404 on newer Google accounts.

For Mailtrap, add `MAILTRAP_API_TOKEN`, `MAILTRAP_SENDER_EMAIL`, and `DIGEST_RECIPIENT`. Verify your sending domain in Mailtrap before enabling production sends in CI.

For `SUPABASE_DB_URL`, use the **Supavisor transaction pooler** (port 6543) from Supabase Dashboard → Connect — GitHub Actions runners are IPv4-only and cannot reach Supabase's direct `db.*.supabase.co` endpoint.

If your database password contains `@`, store it as-is in the secret; the pipeline URL-encodes it automatically.

If the pipeline job fails, a follow-up step runs `python -m pipeline.alert_failure` and emails you at `DIGEST_RECIPIENT` with a link to the GitHub Actions logs.

## Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Vector DB | pgvector in Supabase | One database for relational + vector data, zero extra cost |
| Scheduler | GitHub Actions cron | Free, no server to maintain, built-in secrets |
| LLM output | Function calling | Typed JSON, no fragile text parsing |
| Architecture | Multi-pass agent | Focused steps with partial failure recovery |
| LLM provider | Gemini primary, Groq fallback | Gemini free tier is generous; Groq covers exhaustion |
| Key rotation | Comma-separated env vars | 5 Gemini projects × 20 req/day = 100 calls before fallback |
| Embedding | Local MiniLM | Free at any volume, no rate limits |
| CI database | Supavisor pooler | IPv4-compatible; direct Supabase host is IPv6-only |
| Email | Mailtrap API | Sandbox for local dev; verified-domain production sends in CI |
| Auth | Supabase + approval workflow | Google profile data; OTP for email registration; admin gate |

## License

MIT
