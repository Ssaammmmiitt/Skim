# Skim Design System

> **Implementation:** Tokens live in `src/styles/globals.css`. Component classes are composed in `src/lib/tailwind-ui.ts` (Tailwind utilities). Default theme is **dark**; light and system modes supported via `ThemeProvider`.

## 1. Visual Theme & Atmosphere

Skim is an editorial dashboard for a daily tech digest. The default experience is **dark** (`#0f1419` canvas) with **cyan** as the primary accent — CTAs, links, active states, and story highlights. A **light** theme (`#f1f5f9` canvas) is available via settings. Story tiles use rounded cards on a timeline feed. The mood is **developer console meets morning briefing**: sharp, readable, and fast to scan.

The signature layout is the **StoryStream** timeline: a vertical feed where each item is a pill-cornered card on a dashed cyan rail, with mono-uppercase timestamps on the left. Above it, a bold **Skim** wordmark anchors the masthead. Depth comes from **1px borders and color**, not shadows.

**Key characteristics**
- Dark-default canvas (`#0f1419`) with optional light mode (`#f1f5f9`)
- Cyan accent family (`#22d3ee` → `#0891b2`) for CTAs, links, borders, highlights
- Inter for UI typography (replaces Space Grotesk/DM Sans in implementation)
- Pill buttons and rounded cards (`rounded-2xl`, `rounded-full`)
- Per-topic badge colors (`bg-topic-ai`, etc.)
- Flat depth — 1px borders instead of shadows
- Responsive: mobile drawer nav, tablet strip, desktop centered nav

## 2. Color Palette

### Primary — Skim Cyan
| Token | Hex | Use |
|---|---|---|
| **Cyan Bright** | `#22d3ee` | Primary CTA fill, link color, active tab underline, kicker text |
| **Cyan Core** | `#06b6d4` | Button default, icon accents, story tile fills |
| **Cyan Deep** | `#0891b2` | Borders, hover backgrounds, timeline rail |
| **Cyan Glow** | `#67e8f9` | Highlights on dark surfaces, badge fills |
| **Cyan Muted** | `#164e63` | Subtle tinted panels, selected row background |

### Secondary & Accent
| Token | Hex | Use |
|---|---|---|
| **Teal** | `#14b8a6` | Secondary story tiles, topic tags |
| **Sky** | `#0ea5e9` | Promotional spans, alternate tile accent |
| **Focus Ring** | `#1eaedb` | Keyboard focus only |
| **Link Hover** | `#67e8f9` | All interactive text hover state |

### Surfaces
| Token | Hex | Use |
|---|---|---|
| **Canvas** | `#0f1419` | Page background |
| **Surface** | `#1a2332` | Cards, sidebars, nav bar |
| **Surface Raised** | `#243044` | Hover rows, secondary panels |
| **Image Frame** | `#2d3a4f` | Photo borders |
| **White** | `#ffffff` | Headlines, spotlight tiles |
| **Black** | `#000000` | Text on cyan/white tiles |

### Text
| Token | Hex | Use |
|---|---|---|
| **Primary** | `#f0f9ff` | Headlines, body on dark |
| **Secondary** | `#94a3b8` | Bylines, timestamps, metadata |
| **Muted** | `#cbd5e1` | Button text on dark surfaces |
| **Inverted** | `#0f1419` | Text on cyan or white tiles |

### Semantic
| Token | Hex | Use |
|---|---|---|
| **Success** | `#22d3ee` | Healthy pipeline, sent digest |
| **Warning** | `#fbbf24` | Partial runs, degraded mode |
| **Error** | `#f87171` | Failed runs, alerts |
| **Overlay** | `rgba(0,0,0,0.4)` | Modals, drawers |

### Gradients
No decorative gradients. Color is applied in **solid blocks**. The only transition is from a cyan accent tile back to the dark canvas between rows.

## 3. Typography

### Font Stack
| Role | Family | Fallback |
|---|---|---|
| Display | **Space Grotesk** | system-ui, sans-serif |
| UI / Headlines | **DM Sans** | Helvetica, Arial |
| Labels / Timestamps | **JetBrains Mono** | Courier New, monospace |
| Long-form | **Newsreader** | Georgia, serif |

> Display substitutes: Anton, Oswald, Bebas Neue. Use `line-height: 0.95` at 60px+ to avoid clipping.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Tracking | Notes |
|---|---|---|---|---|---|---|
| Hero Wordmark | Display | 96px | 700 | 0.95 | 1px | "Skim" masthead |
| Display | Display | 72px | 700 | 0.95 | — | Feature headlines |
| Section Headline | DM Sans | 34px | 700 | 1.0 | — | Module titles |
| Story Headline | DM Sans | 24px | 700 | 1.1 | — | Feed tile titles |
| Story Subhead | DM Sans | 20px | 500 | 1.2 | — | Decks, summaries |
| Eyebrow | JetBrains Mono | 12px | 500 | 1.3 | 1.8px | UPPERCASE kickers |
| Body | DM Sans | 16px | 400 | 1.6 | — | Reading text |
| Caption | DM Sans | 13px | 400 | 1.5 | — | Secondary copy |
| Timestamp | JetBrains Mono | 11px | 500 | 1.2 | 1.1px | UPPERCASE rail labels |
| Button | JetBrains Mono | 12px | 600 | 2.0 | 1.5px | UPPERCASE CTAs |

### Principles
- **Display is for heroes only** — 60px minimum. Never use it for buttons or labels.
- **Mono is always UPPERCASE** — timestamps, tags, kickers, button labels.
- **Cyan kickers** (`#22d3ee`) above white headlines create the Skim scan pattern.
- **Tight leading on display**, relaxed (1.5–1.6) on body.

## 4. Components

### Buttons

**Primary — Cyan Pill**
- Background: `#06b6d4`
- Text: `#000000`, JetBrains Mono 12px / 600 UPPERCASE
- Radius: `24px`, padding: `10px 24px`
- Hover: `#22d3ee` fill, 1px `#67e8f9` ring
- Focus: `#1eaedb` fill, 1px `#0891b2` border
- Transition: 180ms ease

**Secondary — Dark Pill**
- Background: `#1a2332`
- Text: `#cbd5e1`, DM Sans 16px / 400
- Radius: `24px`
- Hover: `#243044` bg, cyan text `#22d3ee`

**Ghost — Cyan Outline**
- Background: transparent
- Text: `#22d3ee`, JetBrains Mono 12px UPPERCASE
- Border: `1px solid #06b6d4`
- Radius: `32px`
- Hover: cyan fill, black text

**Tag Pill**
- Background: `#164e63` or `#06b6d4`
- Text: `#67e8f9` or `#000000`
- Radius: `16px`, padding: `4px 10px`
- Font: JetBrains Mono 11px / 600 UPPERCASE

### Cards & Feed

**StoryStream Tile**
- Background: `#1a2332` + `1px solid #243044`, or cyan/teal fill
- Radius: `20px`, padding: `24px`
- Hover: headline shifts to `#67e8f9` — no lift, no shadow
- Kicker in `#22d3ee`, headline in `#f0f9ff`

**Feature Card**
- Background: `#1a2332`, radius `24px`, padding `32px`
- Optional left border: `3px solid #06b6d4`

**Timeline Rail**
- Vertical rule: `1px dashed #0891b2`
- Timestamps: JetBrains Mono 11px UPPERCASE on the left
- Gap between items: `12–16px`

### Inputs
- Background: `#0f1419`, border `1px solid #243044`
- Text: `#f0f9ff`, placeholder `#94a3b8`
- Focus: border `#06b6d4`, optional inner ring `#164e63`
- Radius: `8px`, transition 150ms

### Navigation
- Bar: `#0f1419` with `1px solid #1a2332` bottom border
- Wordmark: Display 32–48px in `#f0f9ff`, cyan dot or underline accent
- Links: `#94a3b8` → hover `#22d3ee`
- Active: `box-shadow: inset 0 -2px 0 #06b6d4`
- CTA: cyan pill pinned right ("View Digest", "Run Pipeline")

### Status Badges (Pipeline)
| State | Background | Text |
|---|---|---|
| Success | `#164e63` | `#67e8f9` |
| Running | `#1a2332` | `#22d3ee` (pulsing dot) |
| Partial | `#422006` | `#fbbf24` |
| Failed | `#450a0a` | `#f87171` |

## 5. Layout

### Spacing (8px base)
`4, 8, 12, 16, 20, 24, 32, 48, 64`

- Section gaps: 32–64px
- Card interior: 20–32px
- Feed item gaps: 12–16px

### Grid
- Max width: `1280px`
- Columns: 12-col underlying → 3-col feed + sidebar on desktop
- Padding: `24px` mobile / `48px` desktop
- Gutters: `16–24px`

### Border Radius Scale
| Size | Use |
|---|---|
| `8px` | Inputs, small badges |
| `12px` | Nested images |
| `16px` | Tags |
| `20px` | Standard cards |
| `24px` | Feature cards, primary buttons |
| `32px` | Ghost buttons |
| `50%` | Avatars, icon buttons |

## 6. Depth & Elevation

| Level | Treatment |
|---|---|
| 0 | Flat canvas `#0f1419` |
| 1 | `1px solid #243044` hairline |
| 2 | `1px solid #0891b2` active border |
| 3 | `3px solid #06b6d4` left accent stripe |
| 4 | Cyan or teal fill — elevation via color, not shadow |

No `box-shadow` for elevation. The single allowed shadow is `inset 0 -2px 0 #06b6d4` on active nav links.

## 7. Do's and Don'ts

### Do
- Use cyan for CTAs, links, kickers, active states (`#06b6d4` / `#22d3ee`)
- Support both dark and light themes via CSS variables
- Round all containers (minimum `8px` radius; pills `rounded-full`)
- Use `tailwind-ui.ts` shared classes — avoid one-off static CSS
- Hover links to `#67e8f9` (dark) or `#0891b2` (light)
- Keep chat layout within viewport (`min-h-0` flex children)

### Don't
- Use Vodafone red or ink tokens — Skim is cyan-branded
- Add elevation shadows — use borders and cyan fills
- Use square corners on cards or primary buttons
- Wash the canvas in cyan — accents only
- Import `@xenova/transformers` at module top level (breaks Vercel)

## 8. Responsive

| Breakpoint | Width | Changes |
|---|---|---|
| Mobile | <768px | Single column, hamburger nav, wordmark ~32px |
| Tablet | 768–1023px | 2-column feed, sidebar collapses |
| Desktop | ≥1024px | Full grid, sidebar visible, hero at full scale |

- Touch targets: 44px minimum on mobile
- Type scales: display 96px → 48px, headlines 34px → 24px
- Cyan accents stay saturated at all breakpoints

## 9. Quick Reference for Agents

### Colors
```
Canvas:       #0f1419
Surface:      #1a2332
Primary CTA:  #06b6d4
Accent:       #22d3ee
Highlight:    #67e8f9
Border:       #0891b2
Headline:     #f0f9ff
Metadata:     #94a3b8
Link hover:   #67e8f9
Focus:        #1eaedb
```

### Example Prompts
1. *"StoryStream item on `#0f1419`: 20px-radius card, `1px solid #243044` border, JetBrains Mono 11px UPPERCASE timestamp on a dashed `#0891b2` rail, cyan kicker `#22d3ee`, 24px white headline. Hover headline to `#67e8f9`."*
2. *"Primary button: `#06b6d4` fill, black UPPERCASE mono label, 24px radius, hover `#22d3ee` with `#67e8f9` ring."*
3. *"Pipeline status card on `#1a2332`: success badge `#164e63` bg / `#67e8f9` text, cyan left stripe `3px solid #06b6d4`, metadata in `#94a3b8`."*
4. *"Skim masthead: Space Grotesk 72px `#f0f9ff`, cyan underline `2px solid #06b6d4`, tagline in `#94a3b8`."*

### Iteration Checklist
1. Canvas dark? → `#0f1419`
2. Corners rounded? → 8/12/16/20/24/32px
3. Shadows removed? → use cyan borders instead
4. Cyan on accents only? → not as page wash
5. Mono labels UPPERCASE with 1.1–1.8px tracking?
6. Links hover to `#67e8f9`?

## 10. Implementation Reference

| File | Role |
|------|------|
| `src/styles/globals.css` | CSS variables for dark/light themes |
| `src/lib/tailwind-ui.ts` | Composed Tailwind strings (`btnPrimary`, `card`, `navLink`, …) |
| `src/lib/dashboard-theme.ts` | Theme metadata + normalization |
| `src/components/theme/ThemeProvider.tsx` | DB + localStorage sync |
| `tailwind.config.mjs` | Tailwind v4 config |
| `src/app/layout.tsx` | Inter font, theme boot script |

**Related:** [`README.md`](./README.md) · [`docs/vercel-deploy.md`](../docs/vercel-deploy.md) · [`progress.md`](../progress.md)
