# Skim — Complete Development Plan

---

## 1. Project Overview

**Skim** is an unattended, scheduled agentic pipeline that scrapes tech and AI news daily, reasons over it using LLMs (classify, summarize, critique), stores it for semantic retrieval, emails a curated digest every morning, and serves a full-stack web dashboard with RAG-powered chat — all at zero infrastructure cost.

It is a single, coherent project that demonstrates every skill listed in the MLExperts Full-Stack Intern job description:

- Full-stack development (Next.js dashboard + Python pipeline + Postgres)
- AI/LLM integration with function calling (classification, ranking, insight generation)
- RAG pipelines (embedding + pgvector retrieval for digest and dashboard chat)
- Agentic workflows (multi-step reasoning: classify, critique, select, compose)
- RESTful APIs (dashboard backend API routes)
- Relational + vector database (Postgres + pgvector in one system)
- Production-grade engineering (scheduling, idempotency, error handling, monitoring, testing)

Unlike most student portfolio projects that call an LLM once and render output, Skim runs unattended in production daily, handles failures gracefully, and accumulates a growing corpus that becomes more valuable over time.

---

## 2. Features

### Core Features
- Automated daily ingestion from 5+ free tech/AI news sources (Hacker News, TechCrunch, Ars Technica, The Verge, arXiv)
- Deduplication engine ensuring no article is stored or sent twice
- LLM-powered multi-step reasoning pipeline via function calling
- Per-article classification by topic and importance scoring (1-10)
- Agent-generated editorial insights ("why this matters to a working engineer")
- Intelligent story selection: LLM holistically picks and orders the day's top stories
- Professional HTML email digest delivered automatically every morning
- Full-stack web dashboard to browse all past digests by date
- Semantic search across the entire accumulated article corpus
- RAG-powered chat: ask "what happened in AI this week?" and get cited answers

### Extraordinary / Differentiating Features
- **Multi-pass agentic reasoning** — not a single LLM call, but a 3-pass pipeline where each step feeds the next (classify all, then generate insights for top candidates, then holistically select and order)
- **LLM function calling with structured schemas** — the agent uses formal tool definitions, returning typed JSON, not free-form text
- **Dual-LLM failover** — primary Groq (Llama 3.3 70B) with automatic fallback to Gemini Flash if rate-limited
- **Zero-cost production deployment** — every service on a genuine free tier, no credit card anywhere
- **Idempotent pipeline** — safe to re-run at any time without duplicating data or emails
- **Graceful degradation** — if one source is down, the rest still run; if the LLM fails, a simpler digest is still sent
- **RAG over time-series content** — the vector corpus grows daily, making search and chat more valuable over time
- **Pipeline observability** — every run logs stats to a dedicated table; failures trigger alert emails
- **Reusable architecture** — the same pattern can be repurposed for job-posting trackers, exam-prep digests, research paper monitors

---

## 3. Tech Stack

### Backend Pipeline (Python)
- **Language**: Python 3.11
- **Scraping**: `feedparser` (RSS), `requests` + `BeautifulSoup` (HTML), Hacker News Firebase API
- **Data validation**: Pydantic v2
- **Embeddings**: `sentence-transformers` (`all-MiniLM-L6-v2`, 384 dimensions, runs locally)
- **LLM**: Groq SDK (Llama 3.3 70B, free tier) with `google-generativeai` (Gemini Flash) as fallback
- **Email**: Resend Python SDK (3,000 emails/month free)
- **Templating**: Jinja2 for HTML email composition
- **Database client**: `psycopg2-binary` (direct Postgres) or `supabase-py`

### Frontend Dashboard (TypeScript)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui component library
- **Database client**: Supabase JS client (`@supabase/supabase-js`)
- **LLM (for RAG chat)**: Groq JS SDK or Vercel AI SDK
- **Deployment**: Vercel (free hobby tier, auto-deploy on push)

### Database
- **Provider**: Supabase (free tier — 500MB storage, unlimited API requests)
- **Engine**: PostgreSQL 15 with pgvector extension
- **Purpose**: Single database serves both relational storage (articles, digests, pipeline runs) and vector search (embeddings)

### Infrastructure / DevOps
- **Scheduler**: GitHub Actions cron (free 2,000 min/month)
- **CI/CD**: GitHub Actions for pipeline + Vercel for dashboard
- **Secrets management**: GitHub repository secrets + Vercel environment variables
- **Monitoring**: Pipeline stats table + failure alert emails

### Why This Stack (Justification for Interviews)
- **Python for pipeline**: Best library ecosystem for scraping, NLP, and embeddings — `feedparser`, `sentence-transformers`, `beautifulsoup4` have no TypeScript equivalents of equal quality
- **TypeScript/Next.js for dashboard**: Industry standard for modern full-stack web apps, shows versatility across languages
- **Supabase over raw Postgres**: Instant setup, built-in pgvector, REST API, free tier generous enough, still real Postgres underneath
- **pgvector over Pinecone/Weaviate**: One fewer external service, zero additional cost, queries are just SQL, and co-locating vectors with relational data simplifies joins
- **GitHub Actions over a server**: Zero cost, zero maintenance, built-in secrets, perfect for a daily batch job
- **Groq over OpenAI**: Completely free tier with generous limits, fast inference, supports function calling, no credit card required
- **Monorepo**: One repo = one project to show in portfolio, simpler CI, easier for interviewers to clone and explore

---

## 4. Repository Structure

```
Skim/
├── pipeline/                    # Python backend (the agentic pipeline)
│   ├── __init__.py
│   ├── main.py                  # Entry point: orchestrates full pipeline
│   ├── config.py                # Environment vars, source URLs, constants
│   ├── models.py                # Pydantic schemas (Article, Digest, PipelineRun)
│   ├── db.py                    # Database connection, queries, inserts
│   ├── sources/                 # Data ingestion adapters
│   │   ├── __init__.py
│   │   ├── base.py              # Abstract SourceAdapter class
│   │   ├── hackernews.py        # Hacker News API client
│   │   ├── rss.py               # Generic RSS/Atom feed parser
│   │   └── arxiv.py             # arXiv API client (optional)
│   ├── embed.py                 # Embedding generation + vector storage
│   ├── agent/                   # LLM reasoning pipeline
│   │   ├── __init__.py
│   │   ├── tools.py             # Function calling tool schemas
│   │   ├── prompts.py           # System prompts, few-shot examples
│   │   ├── reasoning.py         # ArticleAgent class (3-pass logic)
│   │   └── llm_client.py        # Groq/Gemini client with failover
│   ├── compose.py               # Digest HTML composition (Jinja2)
│   ├── email_sender.py          # Resend/SMTP email delivery
│   ├── resilience.py            # Retry logic, error handling utilities
│   ├── alert_failure.py         # Failure notification script
│   ├── requirements.txt         # Pinned Python dependencies
│   ├── .env.example             # Documented env var template
│   └── tests/                   # Unit + integration tests
│       ├── test_sources.py
│       ├── test_dedup.py
│       ├── test_embed.py
│       ├── test_agent.py
│       ├── test_compose.py
│       └── fixtures/            # Mock RSS XML, sample articles
├── dashboard/                   # TypeScript frontend (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Home: today's digest
│   │   │   ├── layout.tsx       # Root layout with nav
│   │   │   ├── archive/
│   │   │   │   └── page.tsx     # Browse past digests by date
│   │   │   ├── chat/
│   │   │   │   └── page.tsx     # RAG chat interface
│   │   │   └── api/
│   │   │       ├── digests/
│   │   │       │   └── route.ts # GET /api/digests?date=...
│   │   │       ├── search/
│   │   │       │   └── route.ts # GET /api/search?q=...
│   │   │       └── chat/
│   │   │           └── route.ts # POST /api/chat (RAG endpoint)
│   │   ├── components/
│   │   │   ├── DigestCard.tsx
│   │   │   ├── ArticleItem.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── TopicBadge.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   └── SourceCitation.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts      # Supabase client init
│   │   │   ├── types.ts         # Shared TypeScript types
│   │   │   └── utils.ts         # Helper functions
│   │   └── styles/
│   │       └── globals.css      # Tailwind base styles
│   ├── public/                  # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── .env.example
├── .github/
│   └── workflows/
│       └── digest.yml           # Cron-triggered pipeline workflow
├── sql/
│   └── schema.sql               # Full database schema (for reference/setup)
├── docs/
│   ├── DEVELOPMENT_PLAN.md      # This file
│   └── architecture.md          # Architecture diagram + decision log
├── .gitignore
└── README.md
```

---

## 5. Database Schema

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Core articles table
CREATE TABLE articles (
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
CREATE TABLE digests (
    id SERIAL PRIMARY KEY,
    digest_date DATE UNIQUE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    article_ids INTEGER[] NOT NULL,
    story_count INTEGER NOT NULL,
    subject TEXT
);

-- Pipeline run observability
CREATE TABLE pipeline_runs (
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

-- Vector similarity search index
CREATE INDEX articles_embedding_idx ON articles
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Fast lookups
CREATE INDEX articles_digest_date_idx ON articles(digest_date);
CREATE INDEX articles_source_idx ON articles(source);
CREATE INDEX articles_topic_idx ON articles(topic);
```

---

## 6. Phase-wise Development Plan

---

### PHASE 0: Project Setup and Infrastructure (1 day)

#### Overview
Before writing any business logic, establish the complete development environment, external services, and CI/CD pipeline. The principle: prove every infrastructure dependency works in isolation before building on top of it. This eliminates the most frustrating class of bugs — "everything works locally but breaks in CI" — on day one.

#### Backend Tasks

**Task 0.1: Initialize Python pipeline structure**
- **What**: Create the `pipeline/` directory with `__init__.py`, `main.py` (with a placeholder `print("Skim pipeline starting")`), `config.py`, `requirements.txt`
- **Where**: `pipeline/` at repository root
- **How to test**: `cd pipeline && python main.py` prints the message without errors

**Task 0.2: Create `requirements.txt` with all dependencies**
- **What**: Pin all Python packages needed across all phases:
  ```
  feedparser==6.0.11
  requests==2.31.0
  beautifulsoup4==4.12.3
  sentence-transformers==3.0.1
  psycopg2-binary==2.9.9
  groq==0.9.0
  google-generativeai==0.7.2
  resend==2.0.0
  pydantic==2.8.0
  jinja2==3.1.4
  python-dotenv==1.0.1
  pytest==8.3.2
  ```
- **Where**: `pipeline/requirements.txt`
- **How to test**: `pip install -r requirements.txt` completes without errors in a fresh venv

**Task 0.3: Create `.env.example` for local development**
- **What**: Document every environment variable the pipeline needs:
  ```
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_KEY=your-anon-key
  SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
  GROQ_API_KEY=gsk_...
  GEMINI_API_KEY=AI...
  RESEND_API_KEY=re_...
  DIGEST_RECIPIENT=your@email.com
  ```
- **Where**: `pipeline/.env.example`
- **How to test**: Copy to `.env`, fill in real values, `python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.environ['SUPABASE_URL'])"` prints the URL

**Task 0.4: Set up Supabase project and database schema**
- **What**: Create a Supabase free-tier project. Run the full SQL schema (from Section 5 above) in the SQL Editor. Verify pgvector is enabled and tables exist.
- **Where**: Supabase web console (https://supabase.com/dashboard)
- **How to test**:
  - `SELECT * FROM pg_extension WHERE extname = 'vector';` returns a row
  - `SELECT * FROM articles LIMIT 1;` runs without error (returns empty)
  - Connection from local Python: `psycopg2.connect(os.environ['SUPABASE_DB_URL'])` succeeds

#### Frontend Tasks

**Task 0.5: Initialize Next.js dashboard**
- **What**: `npx create-next-app@latest dashboard --typescript --tailwind --app --src-dir --eslint` inside the repo. Add shadcn/ui: `npx shadcn-ui@latest init`. Create `.env.example` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Where**: `dashboard/` at repository root
- **How to test**: `cd dashboard && npm run dev` — browser shows the Next.js welcome page at localhost:3000

**Task 0.6: Configure Supabase client in dashboard**
- **What**: Install `@supabase/supabase-js`. Create `dashboard/src/lib/supabase.ts` that initializes the client with env vars. Create `dashboard/src/lib/types.ts` with TypeScript interfaces matching the DB schema.
- **Where**: `dashboard/src/lib/`
- **How to test**: Import supabase client in a test page, call `supabase.from('articles').select('count')` — should return `{ count: 0 }` without errors

#### DevOps / Infrastructure Tasks

**Task 0.7: Create GitHub Actions workflow skeleton**
- **What**: Create `.github/workflows/digest.yml` with:
  - Cron schedule: `'15 0 * * *'` (6:00 AM NPT = 00:15 UTC)
  - `workflow_dispatch` for manual triggers
  - Steps: checkout, setup Python 3.11, install deps, run `python -m pipeline.main`
  - Initially, `pipeline/main.py` just prints "hello" — proving the infrastructure works
- **Where**: `.github/workflows/digest.yml`
- **How to test**: Push to GitHub, manually trigger workflow via Actions tab, confirm it runs and logs "hello" with exit code 0

**Task 0.8: Store all secrets in GitHub**
- **What**: Go to repo Settings > Secrets > Actions. Add: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_DB_URL`, `GROQ_API_KEY`, `RESEND_API_KEY`, `DIGEST_RECIPIENT`
- **Where**: GitHub repo settings (web UI)
- **How to test**: Modify workflow to `echo "DB URL length: ${#SUPABASE_DB_URL}"` (prints length, not value) — confirm it's non-zero in the workflow log

**Task 0.9: Get all free API keys**
- **What**:
  - Groq: Sign up at console.groq.com, create API key (free, no credit card)
  - Gemini: Sign up at aistudio.google.com, create API key (free tier)
  - Resend: Sign up at resend.com, get API key (free 3,000 emails/month)
- **Where**: External services (browser)
- **How to test**: Each key works in a minimal API call (e.g., Groq: list models endpoint returns 200)

#### Key Decisions

- **Monorepo with `pipeline/` and `dashboard/`** — Reason: One repository means one place to clone, one README, one CI config. Interviewers can explore everything in one `git clone`. Separation of Python and TypeScript directories keeps concerns clean without the overhead of managing two repos.
- **Supabase over raw managed Postgres** — Reason: Instant setup, built-in pgvector support, generous free tier (500MB), REST API for the dashboard, and a web UI for debugging. It's still real PostgreSQL underneath, so all standard SQL knowledge applies.
- **pgvector over a dedicated vector DB (Pinecone, Weaviate, Qdrant)** — Reason: Zero additional cost, one fewer service to manage, vectors live alongside relational data enabling simple JOINs, and the scale (~30 articles/day) is trivially handled by pgvector.
- **GitHub Actions cron over a server/VM** — Reason: Truly zero cost (2,000 free minutes/month, we use ~5 min/day = 150/month), zero maintenance, built-in secrets, built-in caching, and the scheduled trigger is a first-class primitive.
- **Pin all dependency versions** — Reason: Reproducible builds. A pipeline that breaks because a dependency auto-updated overnight is not production-grade.

#### Phase 0 Success Criteria
- GitHub Actions workflow runs on manual trigger and exits cleanly
- Local Python script connects to Supabase and queries empty tables
- Next.js dev server starts and renders
- All API keys verified working

---

### PHASE 1: Ingestion Layer (2-3 days)

#### Overview
Build the data acquisition layer: source adapters that fetch articles from free APIs and RSS feeds, normalize them into a common Pydantic schema, and store them in Postgres with bulletproof deduplication. This is the ETL foundation — every downstream step (embedding, reasoning, digest, search) depends on clean, deduplicated data landing here reliably.

#### Backend Tasks

**Task 1.1: Create the abstract SourceAdapter base class**
- **What**: Define an abstract base class that all source adapters must implement. This enforces a consistent interface and makes it trivial to add new sources later.
  ```python
  # pipeline/sources/base.py
  from abc import ABC, abstractmethod
  from pipeline.models import Article

  class SourceAdapter(ABC):
      name: str

      @abstractmethod
      def fetch(self, limit: int = 30) -> list[Article]:
          """Fetch articles from this source. Returns normalized Articles."""
          pass
  ```
- **Where**: `pipeline/sources/base.py`
- **How to test**: Not directly testable (abstract), but subclasses will be tested

**Task 1.2: Implement Hacker News API adapter**
- **What**: Fetch top stories from `https://hacker-news.firebaseio.com/v0/topstories.json`, then fetch each story's details. Filter to only stories with URLs (skip "Ask HN" text posts). Normalize to Article schema.
  ```python
  # pipeline/sources/hackernews.py
  class HackerNewsAdapter(SourceAdapter):
      name = "hackernews"
      BASE_URL = "https://hacker-news.firebaseio.com/v0"

      def fetch(self, limit: int = 30) -> list[Article]:
          story_ids = requests.get(f"{self.BASE_URL}/topstories.json").json()[:limit]
          articles = []
          for sid in story_ids:
              story = requests.get(f"{self.BASE_URL}/item/{sid}.json").json()
              if story and story.get("url"):
                  articles.append(Article(
                      title=story["title"],
                      url=self._normalize_url(story["url"]),
                      source="hackernews",
                      published_at=datetime.fromtimestamp(story["time"], tz=timezone.utc),
                      summary=story.get("title", ""),
                  ))
          return articles
  ```
- **Where**: `pipeline/sources/hackernews.py`
- **How to test**:
  - Unit: Mock the HN API responses with a fixture JSON. Confirm adapter returns correct Article objects.
  - Unit: Story without `url` field is skipped.
  - Integration: Call live API, confirm at least 10 articles returned with valid URLs.

**Task 1.3: Implement generic RSS adapter**
- **What**: A single adapter class that takes any RSS/Atom feed URL and parses it using `feedparser`. Handles missing fields gracefully (no published date, no description, malformed XML).
  ```python
  # pipeline/sources/rss.py
  class RSSAdapter(SourceAdapter):
      def __init__(self, feed_url: str, source_name: str):
          self.feed_url = feed_url
          self.name = source_name

      def fetch(self, limit: int = 30) -> list[Article]:
          feed = feedparser.parse(self.feed_url)
          articles = []
          for entry in feed.entries[:limit]:
              articles.append(Article(
                  title=entry.get("title", "Untitled"),
                  url=self._normalize_url(entry.get("link", "")),
                  source=self.name,
                  published_at=self._parse_date(entry),
                  summary=self._extract_summary(entry),
              ))
          return [a for a in articles if a.url]
  ```
- **Where**: `pipeline/sources/rss.py`
- **How to test**:
  - Unit: Feed a mock RSS XML string (stored in `tests/fixtures/sample_rss.xml`) with all fields present. Confirm correct parsing.
  - Unit: Feed RSS with missing `<pubDate>`, missing `<description>`, and malformed `<link>`. Adapter should not crash.
  - Unit: Feed an empty/invalid XML string. Adapter should return empty list, not throw.
  - Integration: Fetch live TechCrunch RSS, confirm articles parse correctly.

**Task 1.4: Configure all RSS sources**
- **What**: In `config.py`, define the list of RSS feeds to ingest:
  ```python
  RSS_SOURCES = [
      {"url": "https://feeds.feedburner.com/TechCrunch", "name": "techcrunch"},
      {"url": "https://feeds.arstechnica.com/arstechnica/index", "name": "arstechnica"},
      {"url": "https://www.theverge.com/rss/index.xml", "name": "theverge"},
      {"url": "https://www.technologyreview.com/feed/", "name": "mit_tech_review"},
  ]
  ```
- **Where**: `pipeline/config.py`
- **How to test**: Each URL returns valid RSS when fetched with `requests.get()` (status 200, content-type includes "xml")

**Task 1.5: Implement URL normalization and deduplication logic**
- **What**: Before storing, normalize URLs to prevent duplicates from tracking parameters or www/non-www variants:
  ```python
  # pipeline/sources/base.py (add to base class)
  from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

  def _normalize_url(self, url: str) -> str:
      parsed = urlparse(url)
      params = parse_qs(parsed.query)
      clean_params = {k: v for k, v in params.items()
                      if not k.startswith("utm_") and k not in ["ref", "source"]}
      host = parsed.netloc.lower().removeprefix("www.")
      return urlunparse((parsed.scheme, host, parsed.path,
                         parsed.params, urlencode(clean_params, doseq=True), ""))
  ```
- **Where**: `pipeline/sources/base.py`
- **How to test**:
  - `normalize("https://www.example.com/article?utm_source=twitter&ref=home")` returns `"https://example.com/article"`
  - `normalize("https://Example.COM/path/")` returns `"https://example.com/path/"`
  - Two HN links to the same article with different tracking params resolve to the same URL

**Task 1.6: Implement database insertion with dedup**
- **What**: Write an `insert_articles()` function that bulk-inserts articles using `INSERT ... ON CONFLICT (url) DO NOTHING`. Return count of actually inserted (new) articles.
  ```python
  # pipeline/db.py
  def insert_articles(articles: list[Article]) -> int:
      conn = get_connection()
      inserted = 0
      with conn.cursor() as cur:
          for article in articles:
              cur.execute("""
                  INSERT INTO articles (title, url, source, published_at, summary, raw_text)
                  VALUES (%s, %s, %s, %s, %s, %s)
                  ON CONFLICT (url) DO NOTHING
                  RETURNING id
              """, (article.title, str(article.url), article.source,
                    article.published_at, article.summary, article.raw_text))
              if cur.fetchone():
                  inserted += 1
      conn.commit()
      return inserted
  ```
- **Where**: `pipeline/db.py`
- **How to test**:
  - Insert 5 articles. Query DB. Confirm 5 rows.
  - Insert the same 5 articles again. Confirm still only 5 rows (zero new inserts).
  - Insert 3 new + 2 duplicates. Confirm function returns 3 and DB has 8 total rows.

**Task 1.7: Build the ingestion orchestrator**
- **What**: `ingest.py` instantiates all adapters, calls each one (wrapped in error isolation), collects all articles, and bulk-inserts them.
  ```python
  # pipeline/ingest.py
  def ingest_all_sources() -> list[dict]:
      adapters = [HackerNewsAdapter()] + [RSSAdapter(s["url"], s["name"]) for s in RSS_SOURCES]
      all_articles = []
      for adapter in adapters:
          try:
              articles = adapter.fetch(limit=30)
              all_articles.extend(articles)
              logger.info(f"{adapter.name}: fetched {len(articles)} articles")
          except Exception as e:
              logger.warning(f"{adapter.name} FAILED: {e}")

      new_count = insert_articles(all_articles)
      logger.info(f"Stored {new_count} new articles (of {len(all_articles)} fetched)")
      return get_todays_new_articles()
  ```
- **Where**: `pipeline/ingest.py`
- **How to test**:
  - Integration: Run against live sources. Confirm N > 0 new articles in DB.
  - Run again immediately. Confirm 0 new articles (all deduped).
  - Mock one adapter to raise an exception. Confirm others still run and their articles are stored.

#### Frontend Tasks

None in this phase. (Frontend development begins in Phase 6.)

#### DevOps Tasks

**Task 1.8: Update GitHub Actions to run ingestion**
- **What**: Modify `digest.yml` to run `python -m pipeline.ingest` as the first step (testing just ingestion before adding more stages).
- **Where**: `.github/workflows/digest.yml`
- **How to test**: Manually trigger workflow. Check Supabase dashboard — new article rows should appear.

#### Key Decisions

- **Adapter pattern (abstract base class + concrete adapters)** — Reason: Adding a new source (e.g., Reddit, Dev.to) means writing one small class file without touching any existing code. Open/closed principle in action.
- **URL as the dedup key (not title)** — Reason: Titles can vary slightly across sources (HN editorializes titles). URLs are canonical identifiers. The UNIQUE constraint makes dedup O(1) at the database level.
- **`ON CONFLICT DO NOTHING` (not `DO UPDATE`)** — Reason: We want the first version of an article we see. If HN and TechCrunch both link to the same article, we keep the first one ingested.
- **Error isolation per source** — Reason: RSS feeds go down, APIs have outages. One broken source must never prevent the other 4 from running.
- **30 articles per source cap** — Reason: Stay well within Groq's free-tier rate limits in Phase 3. 5 sources x 30 = 150 max articles/day fetched, but after dedup typically 20-40 new ones.

#### Phase 1 Success Criteria
- Run ingestion locally: 20+ new articles land in Supabase `articles` table
- Run again immediately: 0 new articles (dedup works)
- Deliberately break one source URL: pipeline still completes, other sources' articles are stored
- All URLs in DB are normalized (no tracking params, no www prefix)

---

### PHASE 2: Embedding and Vector Storage (2 days)

#### Overview
Convert every article's text into a dense 384-dimensional vector embedding and store it in pgvector. This enables semantic similarity search — the foundation for the RAG chat feature in Phase 6, and potentially for smarter deduplication or clustering in the future. The embedding model runs locally (no API calls), so this step is completely free regardless of volume.

#### Backend Tasks

**Task 2.1: Create the embedding module**
- **What**: Load the `all-MiniLM-L6-v2` model and expose a function to embed a list of texts. Normalize embeddings for cosine similarity.
  ```python
  # pipeline/embed.py
  from sentence_transformers import SentenceTransformer

  _model = None

  def get_model() -> SentenceTransformer:
      global _model
      if _model is None:
          _model = SentenceTransformer('all-MiniLM-L6-v2')
      return _model

  def embed_texts(texts: list[str]) -> list[list[float]]:
      model = get_model()
      embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
      return embeddings.tolist()
  ```
- **Where**: `pipeline/embed.py`
- **How to test**:
  - `embed_texts(["hello world"])` returns a list containing one list of 384 floats
  - All values are between -1 and 1 (normalized)
  - Same input always produces the same output (deterministic)

**Task 2.2: Implement batch embedding of new articles**
- **What**: Query DB for articles where `embedding IS NULL`, embed them in batches, update the rows.
  ```python
  # pipeline/embed.py (continued)
  def embed_new_articles() -> int:
      conn = get_connection()
      with conn.cursor() as cur:
          cur.execute("""
              SELECT id, title, summary FROM articles
              WHERE embedding IS NULL
              ORDER BY created_at DESC
              LIMIT 100
          """)
          rows = cur.fetchall()

      if not rows:
          return 0

      texts = [f"{row[1]} {row[2] or ''}" for row in rows]
      embeddings = embed_texts(texts)

      with conn.cursor() as cur:
          for (article_id, _, _), emb in zip(rows, embeddings):
              cur.execute(
                  "UPDATE articles SET embedding = %s WHERE id = %s",
                  (emb, article_id)
              )
      conn.commit()
      return len(rows)
  ```
- **Where**: `pipeline/embed.py`
- **How to test**:
  - Insert 5 articles without embeddings. Run `embed_new_articles()`. Confirm all 5 now have non-null embedding columns.
  - Run again. Returns 0 (no new articles to embed). Existing embeddings unchanged.
  - Insert 2 more articles. Run again. Only those 2 get embedded.

**Task 2.3: Implement semantic similarity search function**
- **What**: Given a text query, embed it, then find the K most similar articles using pgvector's cosine distance operator.
  ```python
  # pipeline/embed.py (continued)
  def search_similar(query: str, k: int = 5, min_similarity: float = 0.3) -> list[dict]:
      query_embedding = embed_texts([query])[0]
      conn = get_connection()
      with conn.cursor() as cur:
          cur.execute("""
              SELECT id, title, url, source, summary, insight,
                     1 - (embedding <=> %s::vector) as similarity
              FROM articles
              WHERE embedding IS NOT NULL
              ORDER BY embedding <=> %s::vector
              LIMIT %s
          """, (query_embedding, query_embedding, k))
          columns = [desc[0] for desc in cur.description]
          results = [dict(zip(columns, row)) for row in cur.fetchall()]
      return [r for r in results if r['similarity'] >= min_similarity]
  ```
- **Where**: `pipeline/embed.py`
- **How to test**:
  - Insert and embed 3 AI articles and 3 cooking articles. Search "large language model" — top results should be the AI articles.
  - Search "pasta recipe" — top results should be the cooking articles (or empty if min_similarity filters them).
  - Search with `k=1` — returns exactly 1 result.

**Task 2.4: Create a Supabase RPC function for vector search (for dashboard use)**
- **What**: Create a Postgres function that the dashboard can call via Supabase's `.rpc()` method:
  ```sql
  CREATE OR REPLACE FUNCTION search_similar_articles(
      query_embedding vector(384),
      match_count int DEFAULT 5,
      match_threshold float DEFAULT 0.5
  ) RETURNS TABLE (
      id int, title text, url text, source text, summary text,
      insight text, published_at timestamptz, similarity float
  ) AS $$
  BEGIN
      RETURN QUERY
      SELECT a.id, a.title, a.url, a.source, a.summary,
             a.insight, a.published_at,
             1 - (a.embedding <=> query_embedding) as similarity
      FROM articles a
      WHERE a.embedding IS NOT NULL
      ORDER BY a.embedding <=> query_embedding
      LIMIT match_count;
  END;
  $$ LANGUAGE plpgsql;
  ```
- **Where**: Run in Supabase SQL Editor (also save in `sql/schema.sql`)
- **How to test**: Call via Supabase REST API with a sample vector — should return articles ordered by similarity

#### Frontend Tasks

None in this phase directly, but Task 2.4 prepares the RPC function the dashboard will use in Phase 6.

#### DevOps Tasks

**Task 2.5: Add model caching to GitHub Actions**
- **What**: The `all-MiniLM-L6-v2` model is ~80MB. Add a cache step so it's not re-downloaded on every run:
  ```yaml
  - name: Cache sentence-transformers model
    uses: actions/cache@v4
    with:
      path: ~/.cache/torch/sentence_transformers
      key: st-all-MiniLM-L6-v2-v1
  ```
- **Where**: `.github/workflows/digest.yml`
- **How to test**: First workflow run downloads model (~2 min). Second run hits cache and skips download (check "Cache restored" in logs).

#### Key Decisions

- **`all-MiniLM-L6-v2` over larger models (e.g., `all-mpnet-base-v2`)** — Reason: 384 dimensions vs 768 means half the storage cost in pgvector. The quality difference is negligible for our use case (short news titles + summaries). Model is only 80MB, loads fast in CI.
- **Local embedding over an API (OpenAI, Cohere)** — Reason: Completely free at any volume. No rate limits, no API keys needed for this step. Runs in ~10 seconds for 30 articles on a GitHub Actions runner.
- **Embed `title + summary` (not full text)** — Reason: MiniLM's sweet spot is 128-256 tokens. Titles + summaries capture the semantic core. Full article text would be truncated anyway and add noise.
- **IVFFlat index over HNSW** — Reason: IVFFlat is simpler, uses less memory, and is perfectly sufficient for our scale (<10k vectors). HNSW would be overkill and slower to build.
- **`WHERE embedding IS NULL` pattern** — Reason: Makes the embedding step idempotent. Safe to re-run at any time. If the pipeline crashes between ingestion and embedding, the next run picks up where it left off.

#### Phase 2 Success Criteria
- All articles in DB have non-null embeddings after running embed step
- `search_similar("OpenAI GPT")` returns AI-related articles at the top
- `search_similar("cooking recipes")` returns low-similarity results (or empty with threshold)
- Embedding step is idempotent — running twice produces no changes
- Model is cached in GitHub Actions (second run is faster)

---

### PHASE 3: Agent Reasoning Pipeline (4-5 days)

#### Overview
This is the technical centerpiece of Skim — the "agentic" phase. An LLM with function-calling capabilities performs multi-step reasoning over articles in three passes: (1) classify each article by topic and importance, (2) generate editorial insights for the top candidates, (3) holistically select and order the day's top stories for the digest. This is fundamentally different from a single "summarize this" prompt — it's a structured, multi-step pipeline where each pass builds on the output of the previous one, and the LLM makes decisions via formal tool calls with typed schemas.

#### Backend Tasks

**Task 3.1: Create the LLM client with dual-provider failover**
- **What**: A wrapper around Groq and Gemini that tries Groq first, falls back to Gemini on rate-limit errors.
  ```python
  # pipeline/agent/llm_client.py
  from groq import Groq
  import google.generativeai as genai

  class LLMClient:
      def __init__(self):
          self.groq = Groq(api_key=os.environ["GROQ_API_KEY"])
          genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
          self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
          self.provider = "groq"

      def chat_with_tools(self, messages: list, tools: list, tool_choice=None) -> dict:
          try:
              response = self.groq.chat.completions.create(
                  model="llama-3.3-70b-versatile",
                  messages=messages,
                  tools=tools,
                  tool_choice=tool_choice or "auto",
              )
              self.provider = "groq"
              return self._parse_response(response)
          except (RateLimitError, APIError) as e:
              logger.warning(f"Groq failed ({e}), falling back to Gemini")
              return self._gemini_fallback(messages, tools)
  ```
- **Where**: `pipeline/agent/llm_client.py`
- **How to test**:
  - Call with a simple prompt and tool. Confirm structured response from Groq.
  - Mock Groq to raise `RateLimitError`. Confirm Gemini fallback is invoked and returns valid response.
  - Mock both providers failing. Confirm a clear `LLMProviderError` is raised (not a silent failure).

**Task 3.2: Define function calling tool schemas**
- **What**: Three formal tool definitions that the LLM will "call" to output structured data.
- **Where**: `pipeline/agent/tools.py`
- **How to test**: Schemas are valid JSON that Groq's API accepts without error (test by sending a request with these tools defined)

**Task 3.3: Write system prompts and few-shot examples**
- **What**: Craft the system prompt that shapes the agent's behavior, plus few-shot examples that demonstrate expected quality.
- **Where**: `pipeline/agent/prompts.py`
- **How to test**: Qualitative — run prompts against sample articles and evaluate output quality manually. Iterate on wording until classifications match your intuition.

**Task 3.4: Implement Pass 1 — Classification**
- **What**: The `classify_batch` method sends articles to the LLM in batches of 5, requesting function calls to `classify_article` for each. Stores results back to DB.
- **Where**: `pipeline/agent/reasoning.py`
- **How to test**:
  - Feed 5 articles (3 clearly AI-related, 2 clearly not). Confirm topics are correctly assigned.
  - Feed an article about "GPT-5 released" — importance should be >= 8.
  - Feed "Minor CSS library update" — importance should be <= 4.
  - Confirm all articles in DB now have non-null `topic` and `importance_score`.

**Task 3.5: Implement Pass 2 — Insight Generation**
- **What**: For articles with `importance_score >= 5`, generate editorial insights.
- **Where**: `pipeline/agent/reasoning.py`
- **How to test**:
  - Feed an article about a significant AI development. Confirm insight is specific, opinionated, and mentions implications.
  - Insight should NOT just repeat the title/summary. It should add new analytical value.
  - Confirm `insight` and `key_takeaway` fields are stored in DB.

**Task 3.6: Implement Pass 3 — Story Selection**
- **What**: Give the LLM ALL of today's classified articles and ask it to holistically select and order the top 7-10 for the digest.
- **Where**: `pipeline/agent/reasoning.py`
- **How to test**:
  - Feed 20 articles where 3 have importance >= 8. Confirm the top 3 are all in the selected set.
  - Confirm the output order is NOT simply sorted by importance_score.
  - Confirm `rationale` field explains why these were chosen.

**Task 3.7: Wire all three passes together**
- **What**: Create a `run_agent_reasoning()` function that orchestrates the three passes in sequence.
- **Where**: `pipeline/agent/reasoning.py`
- **How to test**: Full integration test: insert 15 sample articles, run `run_agent_reasoning()`. Confirm all have classifications, top ones have insights, and 7-10 are selected for digest.

#### Frontend Tasks

None in this phase.

#### DevOps Tasks

**Task 3.8: Add rate limit handling to workflow**
- **What**: Ensure the workflow has enough timeout to handle Groq rate limits. Set `timeout-minutes: 10`.
- **Where**: `.github/workflows/digest.yml`
- **How to test**: Run workflow with `workflow_dispatch`. Confirm it completes within 10 minutes.

#### Key Decisions

- **Function calling over free-form text generation** — Reason: Structured output via tool schemas guarantees typed JSON every time. No regex parsing, no hallucinated formats.
- **Three separate passes over one mega-prompt** — Reason: Each pass has a focused task. The selection pass needs classification data from pass 1, creating a real dependency chain.
- **Groq (Llama 3.3 70B) as primary** — Reason: Completely free tier (30 req/min, 14,400/day), fast inference, supports function calling well, no credit card needed.
- **Gemini Flash as fallback** — Reason: Different provider means different rate limits and different failure modes. Diversifying providers is a production reliability pattern.
- **Batch size of 5 articles per classification call** — Reason: Batching reduces total API calls. The 2s sleep between batches keeps us well under rate limits.
- **Importance threshold of 5 for insight generation** — Reason: Generating insights for low-importance articles wastes API calls.

#### Phase 3 Success Criteria
- All ingested articles receive topic classifications and importance scores
- Top-scoring articles (>= 5) receive meaningful, non-generic insights
- The selection pass picks 7-10 articles with topic diversity
- LLM failover works: mocking Groq failure triggers Gemini fallback
- Full agent pipeline completes within 5 minutes for 25 articles

---

### PHASE 4: Digest Composition and Email Delivery (2-3 days)

#### Overview
Transform the agent's selected and ranked articles (with insights) into a professional, well-formatted HTML email and deliver it via Resend. This phase also wires the entire pipeline together into a single orchestrated entry point. The email is the primary user-facing "product" of Skim.

#### Backend Tasks

**Task 4.1: Create the HTML email template**
- **What**: A Jinja2 template that renders the digest as a clean, email-client-compatible HTML document with inline CSS.
- **Where**: `pipeline/templates/digest.html`
- **How to test**: Render with sample data, open in browser. Send to Gmail/Outlook — check it renders correctly.

**Task 4.2: Implement the compose function**
- **What**: Takes the list of digest articles and renders them into HTML using Jinja2.
- **Where**: `pipeline/compose.py`
- **How to test**: Feed sample articles, confirm HTML contains all titles, insights, and links. Feed empty list, confirm fallback message.

**Task 4.3: Implement email sending via Resend**
- **What**: Send the composed HTML email using Resend's free tier.
- **Where**: `pipeline/email_sender.py`
- **How to test**: Send a test email to your own address. Mock Resend failure — confirm graceful handling.

**Task 4.4: Implement idempotency guard**
- **What**: Before sending, check if today's digest has already been sent. After sending, record it.
- **Where**: `pipeline/db.py`
- **How to test**: Run pipeline twice in same day — second run skips sending.

**Task 4.5: Build the full pipeline orchestrator (`main.py`)**
- **What**: The single entry point that GitHub Actions calls. Orchestrates all steps in order with error handling and timing.
- **Where**: `pipeline/main.py`
- **How to test**: Run locally end-to-end. Confirm email arrives. Run again — no duplicate. Check `pipeline_runs` table.

#### Frontend Tasks

None in this phase.

#### DevOps Tasks

**Task 4.6: Update GitHub Actions workflow to run full pipeline**
- **What**: Change the workflow's run command to `python -m pipeline.main`.
- **Where**: `.github/workflows/digest.yml`
- **How to test**: Manually trigger. Confirm email arrives.

#### Key Decisions

- **Jinja2 for email templating** — Reason: Proper templating with loops, conditionals, and filters. Separation of presentation from logic.
- **Inline CSS in email** — Reason: Gmail, Outlook strip external stylesheets. Inline styles are the only reliable approach.
- **Resend over raw SMTP/Gmail** — Reason: Better deliverability, delivery tracking, generous free tier (3,000/month), cleaner code.
- **Idempotency via `digests` table** — Reason: Never send duplicate emails, even if workflow is triggered twice.
- **Pipeline stats logging** — Reason: Instant observability without reading CI logs.

#### Phase 4 Success Criteria
- End-to-end pipeline sends a well-formatted email with 7-10 stories
- Running twice in one day sends only one email
- `pipeline_runs` table records every run with timing and status
- Email renders correctly in Gmail

---

### PHASE 5: Scheduling, Reliability, and Monitoring (2 days)

#### Overview
Harden the pipeline for unattended daily operation over weeks and months. The goal: forget about Skim for a month and still get a well-formatted digest every morning. If something breaks, know about it within minutes.

#### Backend Tasks

**Task 5.1: Implement exponential backoff retry utility**
- **What**: A reusable retry decorator for all external API calls.
- **Where**: `pipeline/resilience.py`
- **How to test**: Decorate a function that fails twice then succeeds — confirm it returns on third attempt.

**Task 5.2: Implement failure alerting**
- **What**: A standalone script that sends a "pipeline failed" email when GH Actions job fails.
- **Where**: `pipeline/alert_failure.py`
- **How to test**: Run directly — confirm alert email arrives.

**Task 5.3: Add graceful degradation logic**
- **What**: Handle partial failures without crashing. If LLM fails, send simplified digest. If zero articles, send "quiet day" email.
- **Where**: `pipeline/main.py`
- **How to test**: Mock LLM failure — confirm simplified digest still sends.

**Task 5.4: Add structured logging throughout the pipeline**
- **What**: Python logging with timestamps, levels, and module names.
- **Where**: All pipeline modules
- **How to test**: Run pipeline, confirm logs are clear and parseable.

#### Frontend Tasks

None in this phase.

#### DevOps Tasks

**Task 5.5: Finalize the GitHub Actions workflow**
- **What**: Complete workflow with caching, timeout, failure alerting, all env vars.
- **Where**: `.github/workflows/digest.yml`
- **How to test**: Let cron trigger overnight. Confirm email arrives. Deliberately fail — confirm alert fires.

**Task 5.6: Monitor pipeline health over first week**
- **What**: Check daily for one week that emails arrive and `pipeline_runs` shows success.
- **Where**: Supabase dashboard + inbox
- **How to test**: Query pipeline_runs table — all 7 days show "success".

#### Key Decisions

- **Exponential backoff (not fixed delay)** — Reason: More likely to succeed on rate-limited APIs.
- **Graceful degradation over hard failure** — Reason: A digest with just titles is still useful. Nothing is useless.
- **Failure alert via email** — Reason: Same channel as digest, no additional service setup needed.
- **10-minute timeout** — Reason: Fail fast if stuck, rather than GH Actions' default 6-hour timeout.
- **`workflow_dispatch` trigger** — Reason: Test without waiting for cron. Recovery if cron misses a day.

#### Phase 5 Success Criteria
- Pipeline runs unattended for 7+ consecutive days
- Digest email arrives reliably every morning
- One broken source doesn't crash the pipeline
- Failure alert email arrives when pipeline intentionally broken
- `pipeline_runs` table records each day's run accurately

---

### PHASE 6: Dashboard and RAG Chat (3-4 days)

#### Overview
Build the web frontend — a Next.js dashboard deployed on Vercel that provides three capabilities: (1) browse today's digest, (2) explore past digests by date, and (3) ask natural-language questions about the accumulated news corpus via RAG chat. This transforms Skim from "a cron job" into "a full-stack RAG-powered product."

#### Backend Tasks (API Routes in Next.js)

**Task 6.1: Create the digests API route**
- **What**: `GET /api/digests?date=YYYY-MM-DD` returns digest articles for that date (defaults to today).
- **Where**: `dashboard/src/app/api/digests/route.ts`
- **How to test**: Returns correct articles in agent's selected order. Returns empty for dates without digests.

**Task 6.2: Create the search API route**
- **What**: `GET /api/search?q=keyword` returns matching articles via Postgres full-text search.
- **Where**: `dashboard/src/app/api/search/route.ts`
- **How to test**: Returns relevant results, ordered by date. Empty query returns empty array.

**Task 6.3: Create the RAG chat API route**
- **What**: `POST /api/chat` embeds the question, retrieves similar articles from pgvector, calls LLM with context, returns answer + citations.
- **Where**: `dashboard/src/app/api/chat/route.ts`
- **How to test**: Answers cite real articles. Unrelated questions get honest "no relevant data" response. Response < 3 seconds.

#### Frontend Tasks (React Components + Pages)

**Task 6.4: Create the root layout with navigation**
- **What**: Top nav bar (Home, Archive, Chat), dark mode toggle, responsive container.
- **Where**: `dashboard/src/app/layout.tsx`
- **How to test**: Navigate between pages. Works on mobile.

**Task 6.5: Build the Home page (today's digest)**
- **What**: Article cards showing rank, title, source, insight, read-more link.
- **Where**: `dashboard/src/app/page.tsx` + `dashboard/src/components/DigestCard.tsx`
- **How to test**: Shows articles in order. Shows empty state before pipeline runs.

**Task 6.6: Build the Archive page**
- **What**: Date picker to browse past digests.
- **Where**: `dashboard/src/app/archive/page.tsx` + `dashboard/src/components/DatePicker.tsx`
- **How to test**: Select date with digest — articles appear. Select future date — empty state.

**Task 6.7: Build the Chat page (RAG interface)**
- **What**: Chat interface with message history, loading states, source citations.
- **Where**: `dashboard/src/app/chat/page.tsx` + chat components
- **How to test**: Ask question, get cited answer. Follow-up works. Unrelated question handled gracefully.

**Task 6.8: Build the SearchBar component**
- **What**: Debounced search input using the search API.
- **Where**: `dashboard/src/components/SearchBar.tsx`
- **How to test**: Type "GPT" — results filter. Clear — all show. Debounced (no request per keystroke).

**Task 6.9: Build TopicBadge component**
- **What**: Colored badge/pill per topic category.
- **Where**: `dashboard/src/components/TopicBadge.tsx`
- **How to test**: Each topic has distinct color. Unknown topics get gray.

**Task 6.10: Style the dashboard with Tailwind + shadcn/ui**
- **What**: Dark mode, card layout, responsive breakpoints, clean typography.
- **Where**: `dashboard/tailwind.config.js`, `dashboard/src/styles/globals.css`
- **How to test**: Check at 375px, 768px, 1440px. Dark mode toggle works.

#### DevOps Tasks

**Task 6.11: Deploy dashboard to Vercel**
- **What**: Connect repo to Vercel, set root to `dashboard/`, add env vars, enable auto-deploy.
- **Where**: Vercel dashboard
- **How to test**: Push to main triggers deploy. Dashboard loads. Chat works in production.

**Task 6.12: Handle embedding in the dashboard (for RAG queries)**
- **What**: Use `@xenova/transformers` (ONNX runtime) to run MiniLM in the same vector space as pipeline embeddings.
- **Where**: `dashboard/src/lib/embeddings.ts`
- **How to test**: Embed "OpenAI" and search — returns relevant articles.

#### Key Decisions

- **Next.js App Router (not Pages Router)** — Reason: Modern standard, server components, API routes colocated with pages.
- **Server-side Supabase client in API routes** — Reason: Keep service role key server-side. Security best practice.
- **shadcn/ui over building from scratch** — Reason: Production-quality, accessible components with minimal effort.
- **Same embedding model for pipeline and dashboard** — Reason: Vector similarity only works within the same embedding space.

#### Phase 6 Success Criteria
- Dashboard deployed on Vercel, accessible via public URL
- Home page shows today's digest in correct order
- Archive page lets you browse any past date
- Chat page answers questions with cited sources
- Dark mode and mobile responsive
- Page load < 2 seconds, chat response < 4 seconds

---

### PHASE 7: Polish, Documentation, and Demo (1-2 days)

#### Overview
Prepare Skim for presentation in your portfolio, job application, and interviews. Clear documentation, a compelling demo, and well-articulated design decisions show engineering maturity beyond "I called an API."

#### Backend Tasks

**Task 7.1: Clean up all code**
- **What**: Remove dead code, add type hints, run `black` and `isort`.
- **Where**: All files in `pipeline/`
- **How to test**: `black --check pipeline/` and `isort --check pipeline/` pass.

**Task 7.2: Write unit tests for critical paths**
- **What**: Tests for URL normalization, RSS parsing edge cases, dedup, template rendering, idempotency.
- **Where**: `pipeline/tests/`
- **How to test**: `pytest pipeline/tests/ -v` — all pass.

**Task 7.3: Create a small evaluation dataset for the agent**
- **What**: 20 manually labeled articles. Run agent, check topic accuracy > 80%.
- **Where**: `pipeline/tests/fixtures/eval_articles.json`
- **How to test**: Run eval, log results.

#### Frontend Tasks

**Task 7.4: Clean up dashboard code**
- **What**: Proper types (no `any`), consistent naming, remove unused imports.
- **Where**: All files in `dashboard/src/`
- **How to test**: `npm run lint` and `npm run build` — zero errors.

**Task 7.5: Add loading states and error handling to all pages**
- **What**: Every page handles loading, error, and empty states gracefully.
- **Where**: All page components
- **How to test**: Disconnect internet — error state. Slow connection — loading visible.

#### Documentation Tasks

**Task 7.6: Write the README**
- **What**: Architecture diagram (Mermaid), features, tech stack, design decisions, setup instructions, testing, future work.
- **Where**: `README.md`
- **How to test**: Unfamiliar reader can understand and run locally in <10 minutes.

**Task 7.7: Create architecture documentation**
- **What**: System diagram, pipeline sequence diagram, ER diagram, decision log.
- **Where**: `docs/architecture.md`
- **How to test**: Diagrams render on GitHub.

**Task 7.8: Record a demo video**
- **What**: 2-3 minute screen recording: GH Actions run, email arrives, dashboard browse, chat works.
- **Where**: Linked in README
- **How to test**: Clear and impressive in 2 minutes.

#### DevOps Tasks

**Task 7.9: Verify 14+ days of unattended operation**
- **What**: Confirm pipeline has run successfully for 14+ consecutive days.
- **Where**: `pipeline_runs` table
- **How to test**: Query returns 14 success rows.

**Task 7.10: Final deployment verification**
- **What**: Full end-to-end check in production. Lighthouse score > 90.
- **Where**: Production URLs
- **How to test**: Manual walkthrough of all features.

#### Key Decisions

- **README as the first thing interviewers see** — Reason: Most hiring managers spend <60 seconds on a GitHub project.
- **Lightweight LLM eval (not skipped)** — Reason: Strong signal of engineering rigor. Most applicants never evaluate their LLM outputs.
- **Design decisions documented explicitly** — Reason: "Why did you choose X?" is the #1 interview question about portfolio projects.
- **14-day unattended operation requirement** — Reason: Proves production-grade reliability, not a one-time demo.

#### Phase 7 Success Criteria
- README is comprehensive with working architecture diagram
- All code passes linting
- Unit tests pass
- Agent eval shows > 80% topic accuracy
- Demo video recorded and linked
- 14+ days of successful unattended runs
- Can explain every design decision in under 2 minutes

---

## 7. Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 0: Setup | 1 day | Repo + DB + GH Actions cron proven working |
| 1: Ingestion | 2-3 days | Articles flowing into Postgres from 5+ sources |
| 2: Embedding | 2 days | All articles embedded, semantic search verified |
| 3: Agent Reasoning | 4-5 days | Multi-pass classification + insights + selection |
| 4: Digest + Email | 2-3 days | Full pipeline sends formatted email |
| 5: Reliability | 2 days | Unattended daily operation with monitoring |
| 6: Dashboard + RAG | 3-4 days | Live web app with archive + RAG chat |
| 7: Polish | 1-2 days | Documentation, tests, demo, interview prep |
| **Total** | **~3-4 weeks part-time** | |

**Minimum viable product** (Phases 0-5): Working pipeline delivering daily email digests
**Full product** (+ Phase 6): Full-stack RAG application with web dashboard
**Interview-ready** (+ Phase 7): Documented, tested, demonstrated, running in production

---

## 8. How This Maps to the MLExperts JD

| JD Requirement | How Skim Demonstrates It |
|---|---|
| Full-stack foundations | Next.js dashboard (React, TypeScript) + Python pipeline + Postgres |
| AI & LLM integration, function calling | Classification and ranking via tool schemas (Groq/Gemini) |
| RAG pipelines | Embedding + pgvector retrieval for email and dashboard chat |
| Agentic workflows | 3-pass reasoning pipeline (classify, critique, select) |
| RESTful APIs | Dashboard API routes (digests, search, chat) |
| Relational + vector DB | PostgreSQL + pgvector in one Supabase instance |
| Production-grade thinking | Scheduling, idempotency, retry, graceful degradation, monitoring |
| Clean, testable code | Pydantic models, adapter pattern, unit tests, LLM eval |
| Prompt engineering | System prompts, few-shot examples, iterative evaluation |
| Continuous learning | The project literally keeps you current on AI/tech news daily |
