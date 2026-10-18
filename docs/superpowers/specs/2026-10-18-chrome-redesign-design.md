# "Chrome" redesign — design

Date: 2026-10-18 · Status: approved look (mockup), spec for review · Branch: `feat/chrome-redesign`

Visual reference (approved by the owner): [`2026-10-18-chrome-redesign-mockup.html`](2026-10-18-chrome-redesign-mockup.html)
— open it in a browser; the ◐ button switches dark/silver. It hotlinks car images from the live site.

## Goal

A distinctive, memorable identity (black/chrome, technical, editorial) **without** making the data slower to read.
Success: a first-time visitor recognises an own visual identity; a GT7 player still finds the best car for a race
as fast as today.

Sources of the look (owner's Pinterest pins, see vault note `Projetos/bop-radar.md`): Armored Core art book
(editorial grid, uppercase tracked technical titles), JDM poster (bracket labels, vertical Japanese type, film grain),
chrome vinyl/star (one metallic object glowing on black, prism fringe, tiny spec-sheet captions).

## Decisions (from the brainstorm)

| Topic | Decision |
|---|---|
| Purpose | Balance: identity + fast data reading |
| Light theme | Kept as a **"silver"** variant with the same language |
| Elements | Car hero with glow + mono spec sheet · technical titles + `[GR.3]` labels · film grain + chrome logo · vertical Japanese text (desktop only, `aria-hidden`) |
| Data colours | Same meaning, **desaturated**, used sparingly (chips, thin bars); meaning never by colour alone |
| Red | Only 3 places: active nav underline, focus ring, one logo stroke |
| Rollout | 3 phases, each merged and deployed on its own |
| Dependencies | None new: CSS + inline SVG only; fonts unchanged (Barlow Condensed, Inter, JetBrains Mono) |

## Constraints (must hold after every phase)

- WCAG AA: every text token pair ≥ 4.5:1 in both themes (enforced by `tests/js/contrast.test.mjs`); focus ring ≥ 3:1.
- Base font 18 px (`html { font-size: 112.5% }`), tap targets ≥ 44 px, visible focus.
- `prefers-reduced-motion` respected; grain is static (no animation).
- No horizontal scroll at 320/390 px; Lighthouse a11y and SEO stay 100; CLS stays ≤ 0.1.
- Same DOM/class names and data; no change to `site/data`, Python pipeline or routing.
- All templates keep going through `html``` (guard test in `tests/js/escape.test.mjs`).

## Design tokens (from the mockup)

Dark (`:root`):
`--bg #07080a · --panel #101216 · --panel-2 #181b20 · --hover #1d2127 · --line #2a2f36 · --line-hi #4a525c ·
--tick #6b737d · --text #e8ebef · --muted #9ba4ae · --accent #e10600 · --accent-text #ff6a60 · --focus #e10600 ·
--buff #86c9a4 · --nerf #ec938e · --mixed #d9b676 · --s #e3c56a · --a #8fb6e0 · --b #aab2bb · --c #8f98a2 ·
--h #e3a284 · --m #86bcd9 · --l #bba6df`

Silver (`:root[data-theme="light"]` and the `prefers-color-scheme: light` block):
`--bg #dde0e4 · --panel #ffffff · --panel-2 #eef0f3 · --hover #e7eaee · --line #c6ccd3 · --line-hi #ffffff ·
--tick #8a929c · --text #15181c · --muted #4c545e · --accent-text #b30500 · --buff #1d6b44 · --nerf #a5302a ·
--mixed #7a5500 · --s #7a5d00 · --a #285d93 · --b #545e69 · --c #5f6872 · --h #984722 · --m #245f90 · --l #6a479f`

Non-colour tokens (gradients, glow, grain opacity/blend, `--track-wide: .14em`, `--radius: 6px`, `--jp` font stack):
copy from the mockup's `:root` blocks. The current `--focus: #0b57d0` in the light theme becomes `#e10600`
(mockup measured 3.75–4.97:1 against silver surfaces).

## Phase 1 — foundation (whole site)

Files: `site/style.css`, `site/index.html`, `tests/js/contrast.test.mjs`.

- Replace the colour tokens in all three theme blocks with the tables above; add the non-colour tokens.
- Page background: dark solid `--bg`; silver uses the mockup's soft vertical gradient.
- Film grain: one static SVG noise layer (inline data URI in CSS) on `body::before`, `pointer-events: none`,
  opacity 3 % dark / 5 % silver, `screen` / `multiply` blend.
- Logo (`.brand .stripe` in `index.html`): the skewed stripes become chrome gradient bars with a thin red/cyan fringe;
  third stroke red. Brand text uses the chrome gradient (`background-clip: text`) with a solid-colour fallback.
- Panels: hairline `--line` border, lit top edge (`--line-hi`), small corner tick marks (`--tick`) via pseudo-elements.
- Section titles (`h2` in panels): Barlow Condensed uppercase, `letter-spacing: var(--track-wide)`, a hairline running
  to the panel edge. The tiny mono caption above titles ("01 / RANKING · GR.3") is **CSS-only where the text already
  exists** (e.g. muted `<p>` before a title); no new strings in phase 1.
- Bracket labels: tier badges render as `[S]` in the tier colour and track-set badges as small outlined tags —
  done with CSS (`::before`/`::after` brackets), the DOM text stays `S`/`Fast` so screen readers are unchanged.
- Buttons/segmented controls: silver (dark) / graphite (light) instead of red; active nav tab keeps the red underline.
- Update `contrast.test.mjs` only if it needs new pairs (e.g. `--tick` is decorative — exclude; tier colours on
  `--panel` ≥ 4.5). It must keep reading the real `style.css`.

## Phase 2 — car page hero

Files: `site/js/pages/car.js`, `site/style.css`.

- `.car-hero` is a black "photo plate" in **both** themes (re-declares the dark tokens locally).
- Car image with a soft white radial glow underneath, a thin floor line and a faded mirror reflection
  (second flipped image, `aria-hidden`, `alt=""`; no `-webkit-box-reflect`). Silhouette fallback keeps the layout.
- Mono spec sheet next to the image: power (PS), weight (kg), PS/t, PP, balance F:R, handling — values the page
  already has (`m.power_ps`, `m.weight_kg`, `m.ps_per_t`, `m.pp`, `m.balance`, `c.handling`), tiny uppercase captions.
- Bracket labels above the name: `[GR.3] [MAKER] [DRIVETRAIN] [TIER S]` (from data already on the page).
- Fix the two defects seen in the mockup: no empty black band above the photo (image vertically centred with the
  text column); the vertical text must never overlap the car (own column/gutter on the right).
- Mobile (< 700 px): image above the text, spec sheet 2 columns, no reflection if it costs height.

## Phase 3 — vertical Japanese text + polish

Files: `site/js/pages/car.js` (hero), `site/style.css`, optionally `week.js`/`home.js` for one decorative label each.

- Decorative vertical text (`writing-mode: vertical-rl`), `aria-hidden="true"`, hidden below 900 px:
  car hero = `グループ3` (class) + `バランス`; guide page = `デイリーレース` once. Font stack `--jp` (system fonts,
  no new web font).
- Polish pass: spacing, hover states, focus ring visibility on the chrome buttons, home/guide/update/tracks pages
  checked in both themes and both languages.

## Testing (each phase)

- Existing suites green: `uv run ruff check src tests`, `uv run --extra render pytest -q`, `node --test "tests/js/*.test.mjs"`.
- Contrast test updated/green (phase 1).
- Browser check (Claude in Chrome; screenshots work, window resize does not — measure phone widths in an iframe):
  home, week, updates, an update, a car, help, tracks at desktop and 390/320 px, dark and silver, EN and PT;
  no horizontal scroll, no visible entities, no console errors.
- Lighthouse a11y/SEO 100 on home and a car page (if the tool is available; otherwise say so).

## Out of scope

Editorial grid of BoP versions with thumbnails on the car page, Japanese web font, animations, new copy/strings
beyond the decorative Japanese labels, any data or pipeline change.
