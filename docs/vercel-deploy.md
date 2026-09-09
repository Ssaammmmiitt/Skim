# Deploy Skim Dashboard to Vercel

Step-by-step guide for deploying the Next.js 16 dashboard from the `dashboard/` directory to Vercel.

**Current production:** [https://skim-azure.vercel.app](https://skim-azure.vercel.app)

**Related documentation**

| Document | Scope |
|---|---|
| [docs/README.md](./README.md) | Central documentation directory index |
| [docs/dashboard.md](./dashboard.md) | Next.js 16 App Router & Zustand architecture |
| [docs/phase6_auth_admin_preferences.md](./phase6_auth_admin_preferences.md) | Supabase Auth & Google OAuth setup |
| [docs/branding/README.md](./branding/README.md) | Google Cloud OAuth branding configuration |

---

## Prerequisites

- [ ] Supabase database migrations applied in order through `sql/007_preferences_insert_policy.sql`
- [ ] Google OAuth and Email OTP configured in Supabase Auth
- [ ] Supabase URL configuration contains your Vercel domain redirect URLs
- [ ] GitHub repository connected to your Vercel account

---

## 1. Create Vercel Project

1. Navigate to [vercel.com/new](https://vercel.com/new) and import the **Skim** GitHub repository.
2. Configure project settings:
   - **Root Directory:** `dashboard`
   - **Framework Preset:** Next.js (automatically detected)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
3. Configure the environment variables (Step 2) prior to triggering the first build.

---

## 2. Environment Variables

Configure these in **Vercel → Project Settings → Environment Variables** (for Production, Preview, and Development):

| Variable | Required | Purpose & Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Yes** | Supabase anon/publishable key |
| `SUPABASE_SECRET_KEY` | **Yes** | Supabase service-role key (server-side only, bypasses RLS) |
| `SKIM_SUPERUSER_EMAIL` | **Yes** | Your email  -  automatically assigned `superuser` role and `active` status |
| `SKIM_ADMIN_CONTACT_EMAIL` | **Yes** | Recipient for signup alert emails and "Contact Admin" mailto link |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public domain: `https://skim-azure.vercel.app` |
| `GEMINI_API_KEYS` | **For Chat** | Comma-separated Google Gemini API keys for multi-key rotation |
| `HF_TOKEN` | **For Chat** | Hugging Face token  -  **required on Vercel** for query embeddings |
| `GROQ_API_KEYS` | Optional | Comma-separated Groq API keys for emergency LLM failover |
| `MAILTRAP_API_TOKEN` | Optional | Mailtrap API token to send admin alert emails upon new user signups |
| `MAILTRAP_SENDER_EMAIL` | Optional | Verified sender address in Mailtrap (`digest@yourdomain.com`) |
| `MAILTRAP_SENDER_NAME` | Optional | Sender display name (default: `Skim`) |
| `GEMINI_MODEL` | Optional | Default: `gemini-3.6-flash` |
| `GEMINI_FALLBACK_MODELS` | Optional | Default: `gemini-2.0-flash,gemini-3.5-flash-lite` |

> [!WARNING]
> Never prefix secret keys (`SUPABASE_SECRET_KEY`, `GEMINI_API_KEYS`, `GROQ_API_KEYS`, `HF_TOKEN`, `MAILTRAP_API_TOKEN`) with `NEXT_PUBLIC_`.

---

## 3. Supabase Auth Redirect URLs

In **Supabase Dashboard → Authentication → URL Configuration**, configure:

- **Site URL:** `https://skim-azure.vercel.app`
- **Redirect URLs:**
  ```
  https://skim-azure.vercel.app/auth/callback
  https://skim-azure.vercel.app/auth/complete
  http://localhost:3000/auth/callback
  http://localhost:3000/auth/complete
  ```

---

## 4. Post-Deployment Smoke Test

- [ ] **Auth Gateway:** Visiting `/` while signed out redirects to `/login`.
- [ ] **Superuser Sign-In:** Signing in with `SKIM_SUPERUSER_EMAIL` enters `/` and renders the **Admin** link in the nav bar.
- [ ] **Today's Digest:** Home renders today's curated digest stories (or an empty state if before the daily run).
- [ ] **Archive:** `/archive` allows selecting past digest dates and updates URL parameters cleanly.
- [ ] **Search:** `/search?q=AI` executes hybrid search and returns scored results.
- [ ] **Chat:** `/chat` sends a question and receives a cited, grounded answer.
- [ ] **Settings:** `/settings` lets you toggle email format, theme, and topic filters, with live email previews.
- [ ] **Admin Panel:** `/admin` loads pending user signups and enables one-click approval/rejection.
- [ ] **Theme Persistence:** Toggling light/dark/system updates styling immediately without page flicker.

---

## 5. Production Serverless Notes

1. **Query Embeddings:** On Vercel, `SKIM_EMBEDDING_MODE` defaults to `hf` (using Hugging Face Inference API via `HF_TOKEN`) because local ONNX neural runtimes cannot execute reliably in serverless lambdas.
2. **Execution Timeout:** `dashboard/vercel.json` sets `maxDuration: 60` for API routes to accommodate LLM generation.
3. **Automated CI/CD:** Pushing commits to `main` triggers an automatic Vercel build and preview deployment.
