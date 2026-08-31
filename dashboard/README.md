# Skim Dashboard

Next.js app for browsing digests, hybrid search, multi-provider RAG chat, and per-user preferences. **All routes require admin approval** except `/login` and `/pending`.

**Production:** [https://skim-azure.vercel.app](https://skim-azure.vercel.app)

## Auth model

| Method | Use case | After success |
|---|---|---|
| **Google OAuth** | Sign up or sign in | Pending → wait page; superuser → dashboard |
| **Email OTP (Sign up)** | New account registration only | Wait page until admin approves |
| **Email OTP (Sign in)** | Returning approved users | Dashboard (or wait page if still pending) |

Full setup guide: [`docs/phase6_auth_admin_preferences.md`](../docs/phase6_auth_admin_preferences.md)  
Deploy guide: [`docs/vercel-deploy.md`](../docs/vercel-deploy.md)

## Prerequisites

- Node.js 20+
- Supabase project with migrations applied through `sql/006_dashboard_theme.sql`
- Google OAuth credentials configured in Supabase
- Email OTP enabled in Supabase (6-digit code)

**SQL order:** `schema.sql` → `002` → `003` → `004_search_fts.sql` → `005_hybrid_search.sql` → `006_dashboard_theme.sql`

> **Important:** Re-run `sql/005_hybrid_search.sql` if you see `Hybrid RPC unavailable` in logs. The latest version uses `double precision` return types.

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
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public URL (admin alert links) |
| `MAILTRAP_API_TOKEN` | For alerts | Sends admin email on new signup |
| `MAILTRAP_SENDER_EMAIL` | For alerts | Verified sender address |
| `MAILTRAP_SENDER_NAME` | No | Default: `Skim` |
| `GEMINI_API_KEYS` | For chat | Comma-separated Gemini API keys (rotation) |
| `GEMINI_MODEL` | No | Default: `gemini-3.6-flash` |
| `GEMINI_FALLBACK_MODELS` | No | Default: `gemini-2.0-flash,gemini-3.5-flash-lite` |
| `GROQ_API_KEYS` | For chat fallback | Comma-separated Groq keys (last resort) |
| `GROQ_MODEL` | No | Default: `openai/gpt-oss-120b` |
| `HF_TOKEN` | **Vercel chat** | Hugging Face token — **required on Vercel** for query embeddings |
| `SKIM_EMBEDDING_MODE` | No | `hf` \| `local` \| `off` (auto: `hf` on Vercel, `local` locally) |

**Local dev:** query embeddings use `@xenova/transformers` (MiniLM).  
**Vercel:** uses Hugging Face Inference API — set `HF_TOKEN` (same token as pipeline).

## Hybrid RAG retrieval

Search and chat share the same retrieval stack:

1. **Query embedding** — `all-MiniLM-L6-v2` (384-dim, same model as the pipeline)
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
- **Scrollable message area** with fixed input bar (no mobile overflow)
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

## Design (Task 6.10)

Styling uses **Tailwind CSS v4** with Skim **cyan** design tokens and shadcn/ui primitives.

| Concern | Implementation |
|---|---|
| **Tokens** | `src/styles/globals.css` — CSS variables only (`--skim-cyan-core`, surfaces, text) |
| **Components** | `src/lib/tailwind-ui.ts` — shared class strings (`btnPrimary`, `card`, `navLink`, etc.) |
| **Config** | `tailwind.config.mjs` — content paths; theme extensions in CSS `@theme` |
| **Typography** | [Inter](https://fonts.google.com/specimen/Inter) (UI) |
| **Themes** | Light / dark / system via `html.light` / `html.dark`; default **dark** |
| **Theme toggle** | Navbar + user menu + mobile drawer |
| **Primary color** | Cyan `#06b6d4` — buttons, links, active nav, topic accents |
| **Breakpoints** | Mobile `<768px` · Tablet `md` (768px) · Desktop `lg` (1024px)+ |

### Layout notes

- **Chat page:** full viewport height with `min-h-0` flex chain — messages scroll, input stays pinned
- **Nav:** three-tier responsive (mobile drawer, tablet strip, desktop centered links)
- **Footer:** hidden on `/chat` to maximize vertical space

### Responsive test checklist

1. Open each page at **375px**, **768px**, and **1440px**.
2. Confirm nav collapses to hamburger on mobile.
3. Toggle **light / dark / system** — no flash, colors update.
4. Chat: send a message — no horizontal/vertical overflow on mobile.

Full design spec: [`Design.md`](./Design.md). Theme preference stored in `user_digest_preferences.dashboard_theme`.

## Deploy to Vercel

1. Set **Root Directory** to `dashboard`
2. Add all env vars from the table above (especially `HF_TOKEN` + `GEMINI_API_KEYS` for chat)
3. Add Supabase redirect URLs for your Vercel domain
4. Smoke test `/chat` after deploy

See [`docs/vercel-deploy.md`](../docs/vercel-deploy.md).

## Tests

```bash
cd dashboard
npm test          # 81 tests, run once
npm run test:watch
npm run build     # production build
```

Coverage: components, hybrid retrieval, multi-provider LLM client, API routes, email preview, preferences, theme toggle.

## Project docs

| Document | Contents |
|----------|----------|
| [`progress.md`](../progress.md) | Complete serial progress (all phases) |
| [`docs/report.md`](../docs/report.md) | Internal bug log, LLM config, deployment notes |
| [`Design.md`](./Design.md) | Skim cyan design system spec |
