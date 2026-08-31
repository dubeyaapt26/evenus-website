# Handoff: EvenUS marketing website (evenus.app)

## Overview

A seven-page marketing and legal site for **EvenUS** — an app for two people who live together that measures how money, time and mental load are actually shared, and suggests one thing to swap each week.

Pages: Home, Blog, Help, Privacy Policy, Terms of Use, Disclaimer, Delete your account.

The visual language is derived from the EvenUS mobile app itself: warm paper background, sage-green primary, apricot secondary, soft white cards with hairline borders, generous radii, and a single dark charcoal for high-contrast bands.

## About the design files

The `.dc.html` files in this bundle are **design references**, not production code. They are HTML prototypes that demonstrate intended layout, styling, copy and interaction. They run on a small streaming-component runtime (`support.js`) which is **not** part of the deliverable.

The task is to **recreate these designs in the target codebase's own environment** — Next.js/React, Astro, plain static HTML, WordPress, whatever evenus.app already runs on — using its established patterns, routing and component conventions. If there is no existing environment, a static site generator (Astro or Next.js static export) is the right fit: the site is content-heavy, has almost no dynamic behavior, and should be fast and crawlable.

Two pieces of interactive logic must be reimplemented as real code (specified in **Interactions** below): the homepage fairness calculator, and the blog category filter. Everything else is static markup.

## Fidelity

**High fidelity.** Colors, typography, spacing, radii and copy are final. Recreate pixel-for-pixel. All copy in these files is the client's own, taken from the live site — do not rewrite it.

---

## Design tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F7F5EF` | Page background. Also the app's `theme-color`. |
| `paper-alt` | `#FBFAF6` | Alternating section bands, footer |
| `paper-deep` | `#EFEBE1` | Inert chips, track backgrounds, ghost-button hover |
| `card` | `#FFFFFF` | Cards, panels |
| `ink` | `#1B1F1D` | Primary text, dark bands, primary button |
| `ink-2` | `#4B504B` | Long-form body copy on legal pages |
| `ink-3` | `#5E645F` | Secondary text, nav links |
| `ink-4` | `#8A8F89` | Meta text, eyebrow labels |
| `ink-5` | `#A9AEA8` | Tertiary / disabled |
| `line` | `#E4DFD3` | Rules and dividers |
| `line-2` | `#E9E4D8` | Section borders |
| `line-card` | `#EDE8DC` | Card borders |
| `line-ghost` | `#DAD4C6` | Ghost button border |
| `sage` | `#6FB3A2` | Primary accent — progress arcs, bars, slider thumbs |
| `sage-deep` | `#2E6A5C` | Accent text, links |
| `sage-soft` | `#DCEFE9` | Accent chip fill |
| `sage-tint` | `#E7F2EE` | Accent panel fill |
| `sage-line` | `#CFE6DE` | Accent border |
| `sage-bright` | `#8FD0BE` | Accent on dark backgrounds only |
| `apricot` | `#F0A48A` | Secondary accent — partner B in all charts |
| `apricot-deep` | `#A9583C` | Secondary accent text |
| `apricot-soft` | `#FBE3D9` | Secondary chip fill |
| `apricot-line` | `#F2D3C5` | Secondary border |
| `blue-soft` | `#E3EDF7` / `blue-deep` `#3C6389` | Tertiary chip (app mock only) |

On the dark (`#1B1F1D`) bands, text uses `#F7F5EF` at these opacities: 100% headings, 62–65% body, 50–55% labels; rules at 14%.

**Pairing rule:** in every chart, bar and split, **Alex (partner A) is always sage, Sam (partner B) is always apricot.** Never swap.

### Typography

Two families, both Google Fonts:

- **Plus Jakarta Sans** — weights 300, 400, 500, 600, 700, 800. Everything.
- **Newsreader** — *italic only*, weights 300 and 400. Used for exactly three things: the `US` in the wordmark, one emphasized word per major headline, and nothing else.

```
Display / h1     clamp(38px, 5vw, 74px)   700   line-height 1.02–1.04   letter-spacing -0.035em
Section h2       clamp(24px, 3.8vw, 48px) 700   line-height 1.08        letter-spacing -0.03em
Card h3          17.5–18.5px              700   line-height 1.25        letter-spacing -0.02em
Lead paragraph   clamp(16px, 1.4vw, 18.5px) 400 line-height 1.62
Body (legal)     16.5px                   400   line-height 1.68        color #4B504B
Body (cards)     14.5–15.5px              400   line-height 1.6         color #5E645F
Eyebrow label    12.5px                   600   letter-spacing 0.09em   uppercase   color #8A8F89
Micro label      10.5–12px                700   letter-spacing 0.08em   uppercase
Meta / caption   13–14px                  400   color #8A8F89
```

`text-wrap: pretty` on all body copy; `text-wrap: balance` on headlines.

### Spacing, radii, shadow

- Content max width **1180px**, horizontal padding **28px**. Legal/long-form prose column caps at **780px**; Disclaimer and Delete Account use a **900px** page max.
- Vertical section rhythm: `clamp(64px, 8vw, 120px)` top and bottom. Hero: `clamp(48px, 7vw, 104px)` top.
- Radii: `99px` pills · `14px` small tiles · `16–18px` inner cards · `22–26px` cards and panels · `31/36px` phone screen · `38/44px` phone bezel.
- Shadows (used sparingly — only on phone mockups and floating chips):
  - Phone: `0 44px 90px -30px rgba(27,31,29,.42), 0 12px 30px -12px rgba(27,31,29,.24)`
  - Small phone: `0 36px 70px -28px rgba(27,31,29,.4)`
  - Floating chip: `0 18px 40px -18px rgba(27,31,29,.3)`
- Cards get a **1px border, no shadow**. This is deliberate — the warmth comes from the border and paper tone, not elevation.

### Grid / responsive

No media queries anywhere. Everything is intrinsic:
- Card rows: `grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))`
- Two-up asymmetric rows: `repeat(auto-fit, minmax(320–340px, 1fr))`
- Legal pages (TOC + prose): **flex-wrap**, sidebar `flex: 1 1 240px; max-width: 300px`, content `flex: 999 1 520px; min-width: 0`. (Do not use `auto-fit` grid here — it collapses to two equal tracks and drops the sidebar onto its own row.)
- Font sizes and section padding scale with `clamp()`.

Minimum interactive target: sliders are given an explicit `height: 28px` so the hit box is not the 4px track.

---

## Shared chrome

### Header (`SiteHeader.dc.html`)
Sticky, `top: 0`, `z-index: 50`. `background: rgba(247,245,239,.85)` + `backdrop-filter: blur(14px)`, `border-bottom: 1px solid rgba(228,223,211,.9)`. Inner row: max-width 1180, padding `16px 28px`, `display:flex; justify-content:space-between; align-items:center; gap:24px`.

- **Wordmark** (left): `Even` in Plus Jakarta 700 / 22px / `-0.02em` / `#1B1F1D`, immediately followed by `US` in Newsreader italic 400 / same size / `#2E6A5C`. No space between them. Links home.
- **Nav** (center): 14px/500, gap 30px. Inactive `#5E645F`, active/hover `#1B1F1D`. Links: Home, Blog, Help. (The homepage's own header additionally carries in-page anchors: How it works, The app, Try it, Principles, then Blog and Help.)
- **CTA** (right): "Get the app" — pill, `#1B1F1D` bg, `#F7F5EF` text, 14px/600, padding `11px 20px`. Hover: bg → `#2E6A5C`.

Takes one prop, `active: "home" | "blog" | "help" | ""`.

### Footer (`SiteFooter.dc.html`)
`background: #FBFAF6`, `border-top: 1px solid #E9E4D8`, padding `44px 28px`, flex-wrap with `justify-content: space-between`.
Left: wordmark at 20px + `© 2026 EvenUS. A fairer share of everything.` (13px, `#8A8F89`).
Right: Home · Blog · Help · Privacy · Terms · Disclaimer · Delete your account — 13.5px, `#5E645F`, hover `#1B1F1D`, gap `12px 26px`.

---

## Screens

### 1. Home (`EvenUS Website.dc.html`)

**Purpose:** explain what EvenUS measures, show the app, let the visitor try the calculation, state the product's refusals, and hand off to the stores.

Section order:

1. **Hero** — two-column (`auto-fit, minmax(340px, 1fr)`), gap `clamp(40px,5vw,72px)`, centered vertically.
   - Two decorative radial-gradient blooms, `pointer-events:none`, behind everything: sage at `top:-120px; right:-140px; 520px²`, apricot at `top:220px; left:-180px; 440px²`. Both `radial-gradient(circle, rgba(...,.18–.22), transparent 68%)`.
   - Eyebrow pill: "For two people who live together", `#E7F2EE` bg, `#CFE6DE` border, 6px sage dot.
   - H1 in three lines, third line (`the dishes.`) in Newsreader italic 300 `#2E6A5C`.
   - Lead paragraph, max-width 470px, with `one thing` bolded to `#1B1F1D`.
   - Buttons: primary pill (`#1B1F1D`) "Get the app"; ghost pill (1px `#DAD4C6`) "See how it measures" → `#demo`.
   - Caption: "Closed testing. Free while it lasts."
   - Right: a **phone mockup** (see Phone spec) plus two floating cards — "FREE HOURS · 18 vs 11" at `top:236px; left:-30px`, and "THIS WEEK · Take Thursday's dinner — you have the free evening." at `bottom:64px; right:-10px; max-width:186px`.

2. **Refusal ticker band** — `#FBFAF6`, hairline top and bottom, one centered row of four muted phrases separated by `·` dots: No streaks · No nudge button · No public score · No location, calendar or screen time.

3. **How it works** — headline block (max 620px) + four numbered cards in `auto-fit minmax(250px,1fr)`. Number badge is a 42px rounded square (`14px` radius) with a two-digit label; badge fills cycle sage-soft → apricot-soft → blue-soft → paper-deep. Card hover: `translateY(-4px)` and border tints to the badge's accent.

4. **The app** — `#FBFAF6` band. Header row (title left, 340px caption right), then three **260px phone mockups** in a wrapping flex row, gap `clamp(24px,4vw,54px)`, each with a caption below (14.5px/600 title + 13.5px `#8A8F89` line): Dashboard · The weekly swap · Household & profile.

5. **Try it** — the interactive calculator. Two panels, `auto-fit minmax(320px,1fr)`, `align-items:start`:
   - **Left (white card, radius 26):** Alex/Sam legend pills, then three labeled slider groups — Monthly income (1000–9000, step 100), Paid work hours/week (0–70, step 1), Housework & planning (0–45, step 1). Each group has two stacked range inputs, sage accent for A and apricot for B, with the live values echoed in the group's right-hand label. Footer row: "Split method — Proportional to income".
   - **Right (dark card `#1B1F1D`, radius 26):** 118px fairness ring + gap headline; two labeled progress bars for free hours; a two-up stat row (Shared costs %·% / "Hours priced at — Nothing / Never, by design"); and a highlighted suggestion box (`rgba(111,179,162,.14)` fill, `rgba(111,179,162,.3)` border, radius 18) with the label "THIS WEEK'S ONE THING".

6. **What it will never do** — full-width `#1B1F1D` band. Left column: eyebrow "Refusals, not gaps", headline with `never` in Newsreader italic `#8FD0BE`, and the "goes quiet" paragraph. Right column: five rows separated by `1px rgba(247,245,239,.14)` rules, each a 17px/600 title + 14px 55%-opacity explanation.

7. **Privacy stance** — three white cards, `auto-fit minmax(260px,1fr)`: Answers stay private · Two people, no audience · Leave with your data.

8. **FAQ** — `#FBFAF6` band, 900px column, centered headline, five-item accordion. Row: 24px vertical padding, hairline bottom rule, question 17px/600 left, 26px circular `+`/`−` badge (`#EFEBE1`) right. Answer 15.5px/1.65 `#5E645F` with `padding: 0 60px 26px 4px`. Single-open behavior; item 0 open by default.

9. **Get the app** — centered. Headline with `everything` in Newsreader italic sage. Subhead: "EvenUS is in closed testing and is not on the app stores yet. It is free while that lasts." Two dark store badges reading **"Coming soon to the / App Store"** and **"Coming soon to / Google Play"** (radius 14, opacity .92) — these are placeholders; swap for the official Apple/Google badge artwork once the app is listed. Below: "Want in early? support@evenus.app and we'll send a link."

#### Phone mockup spec

Bezel: `background:#1B1F1D; padding:8–9px; border-radius:38–44px` + phone shadow. Screen: `background:#FAF8F2; border-radius:31–36px; overflow:hidden`. Hero phone is `min(320px, 86vw)`; the three showcase phones are 260px wide with a fixed 470px screen height.

**Fairness ring** (used at 170px, 150px and 118px): SVG `viewBox="0 0 160 160"`, rotated `-90deg`. Track circle `r=70`, `stroke-width 13–15`, stroke `#E7EFEB` (or `rgba(247,245,239,.14)` on dark). Value circle same geometry, stroke `#6FB3A2`, `stroke-linecap:round`, `stroke-dasharray:440`, `stroke-dashoffset = 440 − 4.4 × score`. Centered overlay: score at 32–42px/700/`-0.04em`, label beneath at 9.5–11px `#8A8F89`.

Bottom tab bar: hairline top rule, three glyphs (home / plus / profile) `space-around`, inactive `#B4B8B2`, active `#1B1F1D`.

### 2. Blog (`Blog.dc.html`)
Hero: eyebrow "The blog", H1 "Writing", lead "115 pieces on mental load, money and how households actually run."
Filter row: six pills — All, Mental load, Money, Using EvenUS, Life changes, Reviews. Selected = `#1B1F1D` fill, `#F7F5EF` text; unselected = transparent with `#DAD4C6` border and `#5E645F` text. Row has a hairline bottom rule.
Post list: full-width rows, `26px` vertical padding, hairline separators, hover tint `#FBFAF6`. Each row = category chip (sage, uppercase 10.5px) + read time, then title `clamp(19px,2.1vw,25px)`/700/`-0.025em` (max 820px), then 15px excerpt `#5E645F` (max 760px). Rows link to `https://evenus.app/blog/<slug>/`.
Below: a centered ghost pill "Browse all 115 pieces".
Closing band: dark CTA — "Reading about it is one thing. *Measuring it* is another." + light pill "Try the calculation" → home `#demo`.

**32 posts are hard-coded in the prototype as a placeholder dataset.** In production, drive this list from the real CMS/content collection; keep the category taxonomy and the read-time field.

### 3. Help (`Help.dc.html`)
Hero row: title left; a white "Getting in touch" card right, containing the support address highlighted in an apricot inline chip and the "say which phone you are on" note.
Accordion of six questions (same pattern as the homepage FAQ, but larger: question `clamp(17px,1.8vw,20px)`, 28px badge, multi-paragraph answers at 16px/1.68 `#4B504B`, max 760px). First item open by default.
Then a dark "Reporting something that is wrong" panel (radius 26), with the support address in `#8FD0BE`.
Then three link cards: Privacy Policy · Delete your account · Terms of Use.

### 4. Privacy (`Privacy.dc.html`)
Two-column: sticky TOC (`top: 96px`, 12 anchors, hairline-underlined "On this page" label) + prose column.
Notable treatments:
- "The short version" renders as five white summary cards rather than a bulleted list.
- The two data tables become **definition rows**: a two-column intrinsic grid per row (`auto-fit minmax(220px,1fr)`), left = what, right = why plus a sage "Visible to · …" line. Hairline separators.
- "We do not collect" renders as a row of apricot pills.
- "What your partner can / cannot see" is a two-up: sage-bordered card and apricot-bordered card, followed by a full-width dark "What we will never send" panel.
- All anchor targets carry `scroll-margin-top: 100px` to clear the sticky header.
Contact card at the end.

### 5. Terms (`Terms.dc.html`)
Same two-column shell. Twelve numbered sections rendered from data: `01`-style sage ordinal beside each `h2`, paragraphs at 16.5px/1.68, and an optional sage-dot bullet list (used only by §8 Payment). Contact card at the end.

### 6. Disclaimer (`Disclaimer.dc.html`)
Single 900px column, no TOC. Sections separated by `36px` padding and a hairline top rule. The safety statement — "If a conversation at home has stopped being safe, this app is the wrong thing." — is pulled into a dark `#1B1F1D` panel at 17–20px/600; **keep that emphasis, it is the most important sentence on the page.** Closes with three small cards (No guarantee of a result · Third parties · Availability) and a Questions card.

### 7. Delete your account (`Delete Account.dc.html`)
Single 900px column. Two numbered method cards (In the app / By email), then a two-up: a dark card listing what is deleted immediately (sage-dot bullets) beside a white card explaining what is kept and why. Then the "no shadow copy" paragraph, and a sage-tinted (`#E7F2EE` / `#CFE6DE`) "Take a copy first" strip with a `Profile → Export` pill on the right.

> **Google Play requirement:** this page must be publicly reachable at `https://evenus.app/delete-account` without signing in. Do not put it behind auth, and do not let it 404.

---

## Interactions & behavior

### Homepage fairness calculator (must be reimplemented)

State: `incomeA=4500, incomeB=4200, paidA=42, paidB=34, homeA=8, homeB=23`.

```
FREE_BUDGET = 68            // 168h week − 56h sleep − 44h unavoidable personal time
free(paid, home) = max(0, round(FREE_BUDGET − paid − home))

discA = free(paidA, homeA)                  // 18 at defaults
discB = free(paidB, homeB)                  // 11 at defaults
gap   = |discA − discB|                     // 7
score = clamp(28, 99, round(100 − gap × 1.85))   // 87
ringOffset = round(440 − 4.4 × score)
barWidth(d) = round(d / max(discA, discB, 1) × 100) + "%"
moneySplit = round(incomeA / (incomeA + incomeB) × 100) + "% · " + remainder + "%"
```

Defaults are calibrated so the demo opens on exactly the state the rest of the page depicts: **18 vs 11 free hours, 7-hour gap, score 87.** If the formula is changed, the hero chip, the app mockups ("18h / 11h", "A 7-hour gap") and the profile card figures (42h/wk, 34h/wk) must be updated to match.

Suggestion copy, by gap:
- `≤ 2` → "Nothing to swap. Keep the rhythm you have — EvenUS will stay quiet this week." Headline: "Within N hours of even."
- `3–7` → "{Ahead}, take Thursday's dinner and dishes. It's about two hours and closes most of the gap without touching the weekend."
- `> 7` → "{Ahead}, take over the weekly shop and meal planning. That is the piece {Behind} is carrying invisibly, and it is worth roughly half this gap."

Headline for the latter two: "{Ahead} has N more free hours."

Transitions: ring `stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)`; bars `width .5s` same easing. Sliders update on `input`, not `change`.

### Hero entrance animation
Staggered `rise` (`opacity 0 → 1`, `translateY(26px) → 0`), `.9s cubic-bezier(.2,.75,.25,1)`, `both`, delays: headline lines `.05 / .17 / .29s`, lead `.42s`, buttons `.54s`, caption `.8s`.
Ring draws with `stroke-dashoffset 440 → 57` over `1.8s cubic-bezier(.2,.8,.2,1)` at `.9s`; score counts in at `1.5s`; balance bars `scaleX(0 → 1)` at `1.6–1.9s`.
Phone drifts `translateY(0 → −16px)` over `5.5s ease-in-out alternate infinite`; the two floating chips bob `±8–10px` over `6s` and `7s`.

### Scroll reveal
`IntersectionObserver` (`rootMargin: 0px 0px -12% 0px`, `threshold: .05`) on every `[data-reveal]` section: start `opacity:0; translateY(22px)`, transition `opacity .85s ease, transform .95s cubic-bezier(.2,.75,.25,1)`, unobserve after firing. A 4s timeout force-reveals everything as a failsafe — **keep that failsafe**, and respect `prefers-reduced-motion` by skipping the initial hidden state entirely.

### Accordions
Single-open. Clicking the open item closes it (state → `-1`). Buttons are real `<button>` elements; add `aria-expanded` and `aria-controls` in production — the prototype omits them.

### Blog filter
Client-side filter on the category field. "All" shows everything. No pagination in the prototype; add it (or infinite scroll) if the real list runs to 115.

---

## Copy

**All copy in these files is the client's own, lifted verbatim from the live evenus.app.** Do not rewrite, shorten or "improve" it. Note the British spellings (counselling, organising, labelled) and the em-dash-light, plain-statement voice — match it in anything new.

### Outstanding placeholders

These strings appear literally in the prototypes and **must be filled before launch**:

- `[COMPANY NAME]` — Privacy (×3), Terms §10, Disclaimer
- `[COMPANY ADDRESS]` — Privacy (×2), Terms contact
- `[JURISDICTION]` — Terms §12

`support@evenus.app` is already wired into every contact point, including `mailto:` links.

The live Privacy and Terms pages carry an internal "⚠️ Drafted, not legal advice — before publishing, replace…" note at the top. That note is **deliberately omitted** from these designs, as it reads as an internal to-do rather than published copy. Confirm with the client before restoring it.

---

## Assets

- **Fonts:** Plus Jakarta Sans and Newsreader, both from Google Fonts. Self-host (`next/font`, Fontsource, or local `woff2`) in production rather than hotlinking; preload the two weights used above the fold.
- **Logo:** none supplied. The wordmark is set in type (see Header). If a real SVG logo exists, swap it in; the app's login screen uses a pink→purple gradient wordmark that does **not** match this site's palette — confirm which mark is current before using it.
- **Store badges:** placeholder text badges. Replace with official Apple and Google artwork at listing time.
- **Illustration / photography:** none. The phone mockups are built entirely from HTML and one inline SVG ring. If you replace them with real screenshots, keep the bezel, shadow and caption treatment.
- **Icons:** the prototype uses a handful of Unicode glyphs (`⌂ + ◯ ⚙ ◐ ⬡ ⎋ ▶`) as stand-ins. Replace with a real icon set (Lucide or Phosphor at 1.5px stroke suits this palette).

## SEO / head

Per page, mirroring the live site: `theme-color #F7F5EF`, canonical URL, `og:title`, `og:description`, `og:site_name: EvenUS`, `og:type: website`, `twitter:card: summary`. Home title: "EvenUS — A fairer share of everything."; others: "Blog · EvenUS", "Help · EvenUS", and so on. Every page needs a skip-to-content link (`#main`), which the prototypes omit.

## Accessibility notes for implementation

The prototypes are visual references and skip several things production must include:
- Skip link, landmark elements (`<header> <nav> <main> <footer>`), and a single `<h1>` per page.
- `aria-expanded` / `aria-controls` on accordion triggers; `aria-pressed` on blog filter pills.
- Visible focus rings — none are defined; add a 2px `#2E6A5C` outline with 2px offset.
- Accessible names on the six range inputs (each currently relies on a shared group label).
- Contrast: `#8A8F89` on `#F7F5EF` is ~3.4:1 — acceptable for the large meta text it is used on, but do not drop it below 13px or apply it to body copy.
- `prefers-reduced-motion`: disable the hero drift/bob loops and the scroll reveal.

## Files in this bundle

| File | Contents |
|---|---|
| `EvenUS Website.dc.html` | Home |
| `Blog.dc.html` | Blog index (32 placeholder posts, 6 filters) |
| `Help.dc.html` | Help / support |
| `Privacy.dc.html` | Privacy Policy |
| `Terms.dc.html` | Terms of Use |
| `Disclaimer.dc.html` | Disclaimer |
| `Delete Account.dc.html` | Delete your account |
| `SiteHeader.dc.html` | Shared header |
| `SiteFooter.dc.html` | Shared footer |
| `support.js` | Prototype runtime — **not** part of the deliverable; present only so the HTML files open in a browser |

Open any page directly in a browser to see it rendered. Page-to-page links are relative filenames, so the whole set navigates offline.
