# Deploy Skim Dashboard to Vercel

Deploy the Next.js dashboard from the `dashboard/` directory. The Python pipeline stays on GitHub Actions  -  only the web app goes to Vercel.

**Current production:** [https://skim-azure.vercel.app](https://skim-azure.vercel.app)

## Prerequisites

- [ ] Supabase migrations applied through `sql/006_dashboard_theme.sql`
- [ ] Google OAuth + Email OTP configured in Supabase Auth
- [ ] Redirect URLs include your Vercel domain (see below)
- [ ] GitHub repo connected to Vercel

## 1. Create Vercel project

1. [vercel.com/new](https://vercel.com/new) → Import the Skim GitHub repo
2. **Root Directory:** `dashboard`
3. **Framework Preset:** Next.js (auto-detected)
4. **Build Command:** `npm run build` (default)
5. Deploy once with env vars (step 2)  -  first deploy may fail without secrets

## 2. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production + Preview):

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Anon/publishable key |
| `SUPABASE_SECRET_KEY` | Yes | Service role  -  server only |
| `SKIM_SUPERUSER_EMAIL` | Yes | Auto-approved admin |
| `SKIM_ADMIN_CONTACT_EMAIL` | Yes | Wait page + signup alerts |
| `GEMINI_API_KEYS` | For chat | Comma-separated (same as pipeline) |
| `GROQ_API_KEYS` | For chat fallback | Comma-separated |
| `HF_TOKEN` | For chat on Vercel | Hugging Face read token  -  **required** for query embeddings in production (local MiniLM does not run reliably on serverless) |
| `GEMINI_FALLBACK_MODELS` | No | `gemini-2.0-flash,gemini-3.5-flash-lite` |
| `MAILTRAP_API_TOKEN` | For alerts | Admin signup emails |
| `MAILTRAP_SENDER_EMAIL` | For alerts | Verified sender |
| `NEXT_PUBLIC_SITE_URL` | Recommended | `https://skim-azure.vercel.app` |

**Never** prefix Gemini/Groq keys with `NEXT_PUBLIC_`.

## 3. Supabase Auth redirect URLs

In **Supabase → Authentication → URL Configuration**, add:

```
https://skim-azure.vercel.app/auth/callback
https://skim-azure.vercel.app/auth/complete
```

(Replace with your domain if different.)

Keep localhost URLs for local dev:

```
http://localhost:3000/auth/callback
http://localhost:3000/auth/complete
```

Set **Site URL** to your production Vercel URL.

## 4. Smoke test after deploy

- [ ] Visit `/` logged out → redirects to `/login`
- [ ] Google sign-in as superuser → dashboard + Admin nav
- [ ] Home shows today's digest (or empty state)
- [ ] `/archive` date picker works
- [ ] `/search?q=AI` returns hybrid results
- [ ] `/chat`  -  send a question, get cited answer (or structured quota error)
- [ ] `/settings`  -  change theme, save preferences, email preview loads
- [ ] `/admin`  -  pending queue visible for superuser
- [ ] Light/dark toggle in navbar + user menu

## 5. Chat / RAG on Vercel

- Set **`GEMINI_API_KEYS`** (and optionally **`GROQ_API_KEYS`**)  -  without these chat returns 503, not a working answer
- Set **`HF_TOKEN`**  -  query embeddings use the Hugging Face Inference API on Vercel (`SKIM_EMBEDDING_MODE` defaults to `hf` when `VERCEL` is set). Same token as the pipeline uses for model downloads
- Optional: `SKIM_EMBEDDING_MODE=hf|local|off`  -  force embedding strategy (default: `hf` on Vercel, `local` locally)
- First chat message may be slow (~10–30s)  -  cold start + HF model load
- `vercel.json` sets API route `maxDuration: 60` for `/api/chat` and `/api/search`
- Hobby plan: 10s default limit on some regions  -  upgrade or use Pro if chat times out

## 6. Auto-deploy

Push to `main` → Vercel rebuilds automatically when Git integration is enabled.

Pipeline cron (`digest.yml`) is unaffected  -  it runs on GitHub Actions, not Vercel.
