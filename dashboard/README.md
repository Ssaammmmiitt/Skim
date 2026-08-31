# Skim Dashboard

Next.js app for browsing digests, hybrid search, multi-provider RAG chat, and per-user preferences. **All routes require admin approval** except `/login` and `/pending`.

## Auth model

| Method | Use case | After success |
|---|---|---|
| **Google OAuth** | Sign up or sign in | Pending → wait page; superuser → dashboard |
| **Email OTP (Sign up)** | New account registration only | Wait page until admin approves |
| **Email OTP (Sign in)** | Returning approved users | Dashboard (or wait page if still pending) |

Full setup guide: [`docs/phase6_auth_admin_preferences.md`](../docs/phase6_auth_admin_preferences.md)

## Prerequisites

- Node.js 20+
- Supabase project with migrations applied through `sql/006_dashboard_theme.sql`
- Google OAuth credentials configured in Supabase
- Email OTP enabled in Supabase (6-digit code)

**SQL order:** `schema.sql` → `002` → `003` → `004_search_fts.sql` → `005_hybrid_search.sql` → `006_dashboard_theme.sql`

> **Important:** Re-run `sql/005_hybrid_search.sql` if you see `Hybrid RPC unavailable` in logs. The latest version uses `double precision` return types to fix Postgres type mismatches.

## Local development

```bash
cd dashboard
npm install
cp .env.example .env.local   # fill in values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Anon/publishable key |
| `SUPABASE_SECRET_KEY` | Yes | Service role key for profile sync + admin API |
| `SKIM_SUPERUSER_EMAIL` | Yes | Your email — auto-approved as superuser |
| `SKIM_ADMIN_CONTACT_EMAIL` | Yes | Email on wait page + signup alert recipient |
| `MAILTRAP_API_TOKEN` | For alerts | Sends admin email on new signup |
| `MAILTRAP_SENDER_EMAIL` | For alerts | Verified sender address |
| `MAILTRAP_SENDER_NAME` | No | Default: `Skim` |
| `GEMINI_API_KEYS` | For chat | Comma-separated Gemini API keys (rotation) |
| `GEMINI_MODEL` | No | Default: `gemini-3.6-flash` |
| `GEMINI_FALLBACK_MODELS` | No | Default: `gemini-2.0-flash,gemini-3.5-flash-lite` |
| `GROQ_API_KEYS` | For chat fallback | Comma-separated Groq keys (last resort) |
| `GROQ_MODEL` | No | Default: `openai/gpt-oss-120b` |

Query embeddings run locally via `@xenova/transformers` (MiniLM) — no extra API key needed.

## Hybrid RAG retrieval

Search and chat share the same retrieval stack:

1. **Query embedding** — `all-MiniLM-L6-v2` (384-dim, same model as the pipeline) via `@xenova/transformers`
2. **Vector search** — pgvector cosine similarity on `articles.embedding`
3. **Keyword search** — Postgres FTS (`search_vector`) with `websearch_to_tsquery`
4. **Fusion** — Reciprocal Rank Fusion (RRF, k=60) with vector weight 0.55 / FTS weight 0.45
5. **Reranking** — Importance-score boost from the pipeline agent
6. **Fallback chain** — hybrid RPC → in-process RRF → vector-only → FTS → ILIKE

Chat passes conversation history into retrieval so follow-up questions stay grounded.

## Multi-provider chat (answer generation)

After retrieval, `POST /api/chat` generates answers with automatic failover:

```
Gemini primary model (gemini-3.6-flash)
  → rotate through GEMINI_API_KEYS on 429/403/404
  → try GEMINI_FALLBACK_MODELS
  → Groq (GROQ_API_KEYS, openai/gpt-oss-120b)
```

The chat UI shows:
- **Animated loading** — embed → search → generate steps
- **Provider badge** on answers (`gemini · gemini-3.6-flash` or `groq · …`)
- **Structured errors** — quota/rate-limit messages, providers tried, retry button

## User journey (summary)

```
Sign up (Google or email OTP)
        │
        ▼
   /pending  ──► Contact admin (mailto) ──► Admin notified by email
        │                                        │
        │                              Admin approves in /admin
        ▼                                        │
   Dashboard + digests ◄─────────────────────────┘
```

## Pages

| Route | Who can access |
|---|---|
| `/login` | Everyone |
| `/pending` | Authenticated, not yet approved |
| `/`, `/archive`, `/chat`, `/search`, `/settings` | Approved users only |
| `/admin` | Superuser only |

## API (active users only)

| Endpoint | Description |
|---|---|
| `GET /api/digests` | Today's digest (`?date=YYYY-MM-DD` optional) |
| `GET /api/digests/dates` | List of dates with archived digests |
| `GET /api/search` | Hybrid search (`?q=OpenAI`, `?mode=keyword` for ILIKE/FTS only) |
| `GET /api/chat` | Chat quota remaining |
| `POST /api/chat` | RAG Q&A (`{ message, history? }`) — returns `provider`, `model`, `articles_retrieved` |
| `GET /api/settings/preferences` | User digest + dashboard preferences |
| `PUT /api/settings/preferences` | Update preferences (supports partial updates) |
| `GET /api/settings/digest-preview` | Email HTML preview (`?theme=cyan&format=full`) |
| `GET /api/admin/users?status=pending` | Admin: list pending users |
| `POST /api/admin/users` | Admin: approve/reject user |

**Chat error responses** (structured):

```json
{
  "error": "All AI providers are temporarily unavailable...",
  "error_code": "all_providers_failed",
  "retry_after_seconds": 10,
  "tried_providers": ["gemini:gemini-3.6-flash", "groq:openai/gpt-oss-120b"]
}
```

Unauthenticated requests return `401`. Pending users receive `403` on all API routes.

## Design

UI follows [`Design.md`](./Design.md) — Skim cyan theme with **light / dark / system** modes. Theme preference is stored in `user_digest_preferences.dashboard_theme` and synced via `ThemeProvider`.

## Tests

```bash
cd dashboard
npm test          # run once (77 tests)
npm run test:watch  # watch mode
```

Coverage includes components, hybrid retrieval, multi-provider LLM client, API routes, email preview, and preferences validation (Vitest + Testing Library).
