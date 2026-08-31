# Phase 6 — Authentication, Admin Approval & Digest Preferences

> Phases 0–5 (pipeline) are complete. Complete this guide **before** deploying the dashboard publicly.

## Overview

Skim uses **invite-by-approval**: anyone can request an account, but only the **superuser admin** can grant access. Until approved, users see a wait page and cannot read digests, use chat, or receive emails.

**Superuser:** `poudyal.sammit@gmail.com` (`SKIM_SUPERUSER_EMAIL`) — auto-approved, receives signup alerts, manages approvals at `/admin`.

**Capacity:** ~10 approved members + you (11 total on free tier).

---

## Authentication flows

### A. Google sign-up / sign-in

1. User clicks **Continue with Google** on `/login`.
2. Google OAuth returns profile data to Supabase:
   - **Email** (required, verified by Google)
   - **Full name** → stored as `profiles.display_name`
   - **Avatar URL** → stored as `profiles.avatar_url`
   - **Provider** → `profiles.auth_provider = 'google'`
3. Supabase creates `auth.users` row; DB trigger creates `profiles` with `status = pending` (except superuser).
4. **Superuser** → auto `status = active`, redirected to dashboard.
5. **Everyone else** → redirected to `/pending` (wait page).
6. **Admin receives email** that a new signup is waiting (see [Admin notifications](#admin-notifications)).

### B. Email sign-up (registration only — OTP)

Email OTP is for **creating a new account**, not for repeat logins of existing users.

1. User opens `/login` → **Sign up** tab.
2. Enters email → receives **6-digit OTP** (Supabase Email provider).
3. Enters OTP → account created in `auth.users` + `profiles` (`status = pending`).
4. Redirected to `/pending`.
5. Admin notified (same as Google flow).

**Profile fields from email signup:** email (required); display name optional (can be added later in Settings).

### C. Email sign-in (returning approved users)

1. User opens `/login` → **Sign in** tab.
2. Enters email → Supabase sends a **login OTP** (`shouldCreateUser: false`).
3. If account exists and `status = active` → dashboard after OTP.
4. If account is `pending` → `/pending`.
5. If no account → message: *“No account found — use Sign up to request access.”*

### D. Wait page (`/pending`)

Shown when `profiles.status` is `pending` or `rejected`.

| Element | Purpose |
|---|---|
| Status message | Explains approval is required |
| **Contact admin** button | Opens email to admin with pre-filled access request |
| Sign out | Return to `/login` |

Middleware blocks `/`, `/archive`, `/chat`, `/settings`, and all APIs until `status = active`.

### E. Admin approval

1. Admin signs in → **Admin** in nav → `/admin`.
2. Sees pending users (name, email, provider, requested date).
3. **Approve** → `status = active`, added to `digest_subscribers`, default digest preferences created.
4. **Reject** → `status = rejected`, user stays on wait page with rejection message.
5. Cap: **10 approved members** (excluding superuser).

---

## User data collected

| Field | Google | Email signup | Stored in |
|---|---|---|---|
| Email | ✅ | ✅ | `profiles.email`, `auth.users` |
| Display name | ✅ (`full_name`) | — | `profiles.display_name` |
| Avatar | ✅ (`picture`) | — | `profiles.avatar_url` |
| Auth provider | `google` | `email` | `profiles.auth_provider` |
| Approval status | `pending` / `active` | same | `profiles.status` |
| Role | `member` (you: `superuser`) | same | `profiles.role` |

---

## One-time setup checklist

### 1. Database

Run in Supabase SQL Editor **in order**:

1. `sql/schema.sql` (articles, digests, pgvector)
2. `sql/002_users_auth_preferences.sql` (profiles, preferences, RLS, superuser seed)
3. `sql/003_fix_profiles_rls.sql` (fixes redirect loop — run if you already applied 002)
4. `sql/004_search_fts.sql` (full-text search for `/api/search` — optional; API falls back to ILIKE)
5. `sql/005_hybrid_search.sql` (hybrid RAG: MiniLM vector + FTS + RRF for `/api/search` and `/api/chat`)
6. `sql/006_dashboard_theme.sql` (dashboard light/dark/system preference column)

### 2. Supabase Auth — Google

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → **OAuth 2.0 Client ID** (Web application).
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Providers → Google** → enable, paste Client ID + Secret.
4. Request scopes: `email`, `profile`, `openid` (default — provides name and picture).

### 3. Supabase Auth — Email (OTP)

1. **Authentication → Providers → Email** → enable.
2. **Confirm email** → on (recommended).
3. **Email OTP** → enable **6-digit code** (not magic link) for signup/sign-in codes.
4. Customize email template subject/body if desired.

### 4. Supabase URL configuration

| Setting | Value |
|---|---|
| Site URL | `https://your-app.vercel.app` (or `http://localhost:3000` for dev) |
| Redirect URLs | `.../auth/callback`, `.../auth/complete`, `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/complete` |

### 5. Dashboard environment variables

```bash
# dashboard/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...

SKIM_SUPERUSER_EMAIL=poudyal.sammit@gmail.com
SKIM_ADMIN_CONTACT_EMAIL=poudyal.sammit@gmail.com   # shown on wait page + signup alerts

# Optional: same Mailtrap token as pipeline — enables admin signup alert emails
MAILTRAP_API_TOKEN=...
MAILTRAP_SENDER_EMAIL=digest@yourdomain.com
MAILTRAP_SENDER_NAME=Skim

# Chat RAG (Gemini LLM + hybrid retrieval)
GEMINI_API_KEYS=your-key-here
GEMINI_MODEL=gemini-3.6-flash
```

### 6. Vercel

Add the same env vars. Redeploy after changes. Full checklist: [`docs/vercel-deploy.md`](../vercel-deploy.md).

### 7. Verify end-to-end

- [ ] Google login as superuser → dashboard + Admin nav
- [ ] Google login as test user → `/pending` + contact admin button
- [ ] Email signup → OTP → `/pending`
- [ ] Email sign-in (approved user) → dashboard
- [ ] Admin receives signup notification email
- [ ] Admin approves test user → user reaches dashboard + digest list

---

## Admin notifications

When a new user signs up (`profiles.status = pending`), the admin is notified by:

1. **Email** (recommended) — `/auth/complete` calls Mailtrap to `SKIM_ADMIN_CONTACT_EMAIL` with user email, name, and link to `/admin`.
2. **Admin dashboard** — pending queue at `/admin` (always available when logged in as superuser).

Email requires `MAILTRAP_API_TOKEN` + verified sender on the dashboard (same Mailtrap account as the pipeline).

---

## Per-user digest preferences (Phase 6C)

Approved users set email theme/format at `/settings`. Pipeline sends personalized HTML per subscriber. See main README.

---

## Free tier (~11 users)

| Service | Monthly | Limit |
|---|---|---|
| Mailtrap | ~330 emails + alerts | 1,000 |
| Supabase Auth | 11 MAU | 50,000 |
| Gemini | pipeline + chat (rate-limited) | multi-key |

**Expected cost: $0/month**

---

## Implementation map

| Component | Path |
|---|---|
| Login (Google + email signup/signin) | `dashboard/src/app/login/page.tsx` |
| OAuth / OTP callback | `dashboard/src/app/auth/callback/route.ts` |
| Profile sync + admin notify | `dashboard/src/app/auth/complete/route.ts` |
| Wait page + contact admin | `dashboard/src/app/pending/page.tsx` |
| Admin approvals | `dashboard/src/app/admin/page.tsx` |
| Auth middleware | `dashboard/src/middleware.ts` |
| SQL migration | `sql/002_users_auth_preferences.sql` |
