# Skim Branding Assets

Vector and raster branding assets for the Skim application, including Google Cloud OAuth consent screen assets and social preview icons.

**Related documentation**

| Document | Scope |
|---|---|
| [docs/README.md](../README.md) | Central documentation directory index |
| [docs/phase6_auth_admin_preferences.md](../phase6_auth_admin_preferences.md) | Supabase Auth & Google OAuth setup |
| [docs/vercel-deploy.md](../vercel-deploy.md) | Production Vercel deployment |

---

## Asset Inventory

| File | Resolution / Format | Primary Use |
|---|---|---|
| `skim-logo.svg` | Scalable Vector (SVG) | Source vector artwork |
| `skim-logo-120.png` | 120 × 120 px PNG | **Google Cloud OAuth** consent screen app logo (120×120 min) |
| `skim-logo-512.png` | 512 × 512 px PNG | Favicon, repository header, web manifest, social preview |

---

## Google Cloud Console  -  OAuth App Configuration

Use the **same Google Cloud Platform (GCP) project** where you create your Supabase Google OAuth Client ID.

### 1. Branding (OAuth Consent Screen)

| Field | Value |
|---|---|
| **App Name** | `Skim` |
| **User Support Email** | Your administrator email |
| **App Logo** | Upload `skim-logo-120.png` |
| **Application Home Page** | `https://skim-azure.vercel.app` |
| **Application Privacy Policy** | `https://skim-azure.vercel.app/privacy` |
| **Application Terms of Service** | Optional (leave blank or link to repository) |
| **Authorized Domains** | `skim-azure.vercel.app` (without `https://`) |

### 2. Scopes

Configure standard non-sensitive scopes:
- `.../auth/userinfo.email` (`email`)
- `.../auth/userinfo.profile` (`profile`)
- `openid`

Do not request sensitive scopes (e.g. Gmail, Google Drive, or Calendar).

### 3. Credentials (OAuth 2.0 Client ID)

In **APIs & Services → Credentials → OAuth 2.0 Client IDs**:
- **Application Type:** Web application
- **Authorized Redirect URIs:** `https://<supabase-ref>.supabase.co/auth/v1/callback`
- **Authorized JavaScript Origins:** `https://<supabase-ref>.supabase.co`, `https://skim-azure.vercel.app`

### 4. Publishing Status

On the **OAuth consent screen**, switch **Publishing status** to **In production** by clicking **Publish app**. For basic user info scopes, no formal Google verification process is required.

---

## Regenerating PNG Assets from SVG

If the vector artwork `skim-logo.svg` is modified, you can regenerate raster assets with `rsvg-convert`, Figma, or ImageMagick:

```bash
# Export 120x120 PNG for Google OAuth
rsvg-convert -w 120 docs/branding/skim-logo.svg -o docs/branding/skim-logo-120.png

# Export 512x512 PNG for high-res icons
rsvg-convert -w 512 docs/branding/skim-logo.svg -o docs/branding/skim-logo-512.png
```
