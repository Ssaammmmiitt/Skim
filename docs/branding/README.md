# Skim branding assets

| File | Use |
|------|-----|
| `skim-logo.svg` | Source vector logo |
| `skim-logo-120.png` | **Google Cloud OAuth** app logo (120×120 minimum) |
| `skim-logo-512.png` | Favicon, README, social previews |

## Google Cloud Console — publish OAuth app

Use the **same GCP project** as your Supabase Google provider Client ID.

### 1. Branding (OAuth consent screen)

| Field | Value |
|-------|--------|
| **App name** | `Skim` |
| **User support email** | Your email |
| **App logo** | Upload `skim-logo-120.png` |
| **Application home page** | `https://skim-azure.vercel.app` |
| **Application privacy policy** | `https://skim-azure.vercel.app/privacy` |
| **Application terms of service** | Optional (leave blank or link to GitHub repo) |
| **Authorized domains** | `skim-azure.vercel.app` (no `https://`) |

### 2. Scopes

Keep only non-sensitive scopes (default with Supabase Google):

- `email`, `profile`, `openid`

Do not add Gmail, Drive, or Calendar scopes.

### 3. Credentials (redirect URI)

**APIs & Services → Credentials → OAuth 2.0 Client ID:**

- **Authorized redirect URI:** `https://<supabase-ref>.supabase.co/auth/v1/callback`
- **Authorized JavaScript origins:** `https://<supabase-ref>.supabase.co`, `https://skim-azure.vercel.app`

### 4. Publish

On **OAuth consent screen**, set **Publishing status** to **In production** (click **Publish app**).

For basic scopes, verification is usually not required. After publishing, any Google user can sign in (Skim still sends new users to `/pending` until admin approval).

### 5. Deploy privacy page first

Deploy the dashboard to Vercel so `https://skim-azure.vercel.app/privacy` is live before Google reviews the links.

## Regenerate PNG from SVG

If you edit the SVG, export a 120px PNG with Figma, Preview, or:

```bash
rsvg-convert -w 120 docs/branding/skim-logo.svg -o docs/branding/skim-logo-120.png
```
