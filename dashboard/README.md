# Skim Dashboard

Next.js app for browsing digests, managing preferences, and (soon) RAG chat. **All routes require admin approval** except `/login` and `/pending`.

## Auth model

| Method | Use case | After success |
|---|---|---|
| **Google OAuth** | Sign up or sign in | Pending → wait page; superuser → dashboard |
| **Email OTP (Sign up)** | New account registration only | Wait page until admin approves |
| **Email OTP (Sign in)** | Returning approved users | Dashboard (or wait page if still pending) |

Full setup guide: [`docs/phase6_auth_admin_preferences.md`](../docs/phase6_auth_admin_preferences.md)

## Prerequisites

- Node.js 20+
- Supabase project with `sql/schema.sql` and `sql/002_users_auth_preferences.sql` applied
- Google OAuth credentials configured in Supabase
- Email OTP enabled in Supabase (6-digit code)

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
| `SKIM_SUPERUSER_EMAIL` | Yes | Your email — auto-approved as superuser |
| `SKIM_ADMIN_CONTACT_EMAIL` | Yes | Email on wait page + signup alert recipient |
| `MAILTRAP_API_TOKEN` | For alerts | Sends admin email on new signup |
| `MAILTRAP_SENDER_EMAIL` | For alerts | Verified sender address |
| `MAILTRAP_SENDER_NAME` | No | Default: `Skim` |

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

**Google** collects email, full name, and avatar automatically. **Email signup** collects email only (OTP for registration). **Email sign-in** uses OTP for returning approved users — not for new registrations.

## Pages

| Route | Who can access |
|---|---|
| `/login` | Everyone |
| `/pending` | Authenticated, not yet approved |
| `/`, `/archive`, `/chat`, `/settings` | Approved users only |
| `/admin` | Superuser only |

## API (active users only)

| Endpoint | Description |
|---|---|
| `GET /api/digests` | Today's digest (`?date=YYYY-MM-DD` optional) |
| `GET /api/digests/dates` | List of dates with archived digests |
| `GET /api/search` | Keyword search (`?q=OpenAI`) |
| `GET /api/chat` | Chat quota remaining |
| `POST /api/chat` | RAG Q&A (`{ message, history? }`) |
| `GET /api/settings/preferences` | User digest preferences |
| `PUT /api/settings/preferences` | Update digest preferences |
| `GET /api/admin/users?status=pending` | Admin: list pending users |
| `POST /api/admin/users` | Admin: approve/reject user |

Unauthenticated requests return `401`. Pending users receive `403` on all API routes.

## Design

UI follows [`Design.md`](./Design.md) — dark canvas, cyan accents, Skim brand.

## Tests

```bash
cd dashboard
npm test          # run once
npm run test:watch  # watch mode
```

**57 unit tests** cover components, lib helpers, and API route handlers (Vitest + Testing Library).
