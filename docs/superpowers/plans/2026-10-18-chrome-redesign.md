# Chrome Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the site the approved black/chrome + silver identity in three deployable phases without slowing data reading.

**Architecture:** Almost all of it is CSS on the existing DOM (`site/style.css` tokens and components) plus the logo markup in
`site/index.html`. Only the car page hero changes markup (`site/js/pages/car.js`), through `html``` templates and two small
exported pure helpers so they can be unit-tested. The approved mockup is the visual reference for every value not pinned here.

**Tech Stack:** Static SPA (vanilla ES modules, `html``` tagged templates in `site/js/format.js`), plain CSS custom properties,
inline SVG; tests with `node --test`; Python pipeline untouched.

**Spec:** `docs/superpowers/specs/2026-10-18-chrome-redesign-design.md` · **Mockup:** `docs/superpowers/specs/2026-10-18-chrome-redesign-mockup.html`

## Global Constraints

- WCAG AA: every text token pair ≥ 4.5:1 in both themes (`tests/js/contrast.test.mjs`); focus ring ≥ 3:1.
- Base font 18 px (`html { font-size: 112.5% }`), tap targets ≥ 44 px (`--tap`), visible focus.
- `prefers-reduced-motion` respected; grain is static.
- No horizontal scroll at 320 and 390 px; Lighthouse a11y and SEO 100; CLS ≤ 0.1.
- Same DOM class names and data; no change to `site/data`, the Python pipeline or routing.
- Every HTML template goes through `html``` (guard test `tests/js/escape.test.mjs`).
- Red (`--accent #e10600`) only in: active nav underline, focus ring, one logo stroke.
- No new dependencies; fonts stay Barlow Condensed / Inter / JetBrains Mono; Japanese uses the `--jp` system stack.
- Branch `feat/chrome-redesign`; one commit per task; stop before merge (owner approves merge/push per phase).

## Review Focus

1. **Windows high-contrast / `forced-colors: active`** — chrome gradient text (`background-clip: text`) must stay readable:
   brand name and car title fall back to `CanvasText`. Owned by Task 2 and Task 4 (browser step with forced colours emulated
   by checking the `@media (forced-colors: active)` rule exists and sets `color`/`-webkit-text-fill-color`).
2. **Car with no picture** (silhouette, e.g. Stealth) — hero keeps its layout, no empty reflection. Task 4 unit test.
3. **Missing spec values** (`balance` null, `ps_per_t` undefined) — spec sheet shows "—", never "undefined"/"NaN". Task 4 unit test.
4. **Long car names** ("SUZUKI Vision Gran Turismo (Gr.3 Version)") at 320 px in the hero and ranking rows — wrap, no
   horizontal scroll. Task 4 and Task 5 browser steps.
5. **Large text / 200 % zoom** — vertical Japanese text never overlaps the car or the spec sheet. Task 5 browser step.

---

## Phase 1 — foundation

### Task 1: Colour tokens + contrast test

**Files:**
- Modify: `site/style.css:1-27` (`:root`, `:root[data-theme="light"]`, `@media (prefers-color-scheme: light)` blocks)
- Test: `tests/js/contrast.test.mjs`

**Interfaces:**
- Produces: tokens `--bg --panel --panel-2 --hover --line --line-hi --tick --text --muted --accent --accent-text --focus
  --buff --nerf --mixed --s --a --b --c --h --m --l` (exact hex values in the spec's "Design tokens" section) plus non-colour
  tokens copied from the mockup `:root`: `--chrome --chrome-bar --btn-bg --btn-text --glow --panel-shadow --grain-opacity
  --grain-blend --page --jp --fs-xs --track-wide` and `--radius: 6px`. Later tasks only reference these names.

- [ ] **Step 1: Extend the contrast test (fails on the current palette for the new pairs)**

In `contrast.test.mjs` add, for both themes: tier and set colours `s a b c h m l` on `--panel` and `--panel-2` ≥ 4.5;
`--focus` on `--bg` and `--panel` ≥ 3. Keep the existing pairs. (The current `.tier` uses dark text on a filled badge; the
new design puts the tier colour *as text* on panels, hence the new pairs.)

- [ ] **Step 2: Run** `node --test tests/js/contrast.test.mjs` — Expected: FAIL on at least one new pair (e.g. light `--s`).

- [ ] **Step 3: Replace the token values** in all three theme blocks with the spec tables (the light `prefers-color-scheme`
block must equal the `[data-theme="light"]` block); add the non-colour tokens. Light `--focus` becomes `#e10600`.

- [ ] **Step 4: Run** `node --test "tests/js/*.test.mjs"` — Expected: all pass.

- [ ] **Step 5: Commit** `feat(style): chrome/silver colour tokens + contrast pairs for tier/set text and focus`

### Task 2: Surfaces and identity — page, grain, logo, panels, controls

**Files:**
- Modify: `site/style.css` (body, `.top`, `.brand`, `.stripe`, `nav a.on`, `.panel`, `.seg`/`.btn`/`.lang` buttons)
- Modify: `site/index.html:23` (logo markup)

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: logo markup `<span class="stripe" aria-hidden="true"><i></i><i></i><i></i></span>` (three bars; third is red);
  `.panel` gets `::before/::after` corner ticks — later tasks must not use those pseudo-elements on `.panel`.

- [ ] **Step 1: Page + grain.** `body { background: var(--page) }`; `body::before` fixed full-viewport static SVG noise
  (`feTurbulence` data URI), `opacity: var(--grain-opacity)`, `mix-blend-mode: var(--grain-blend)`, `pointer-events: none`,
  `z-index` below `.top`.
- [ ] **Step 2: Logo.** Replace the stripe gradient with three skewed bars: first two `background: var(--chrome-bar)` with a
  1 px red/cyan `box-shadow` fringe, third `var(--accent)`. Brand text: `background: var(--chrome); background-clip: text;
  color: transparent` with `@supports not (background-clip: text)` fallback `color: var(--text)` and
  `@media (forced-colors: active) { .brand { color: CanvasText; -webkit-text-fill-color: CanvasText; background: none } }`.
- [ ] **Step 3: Panels.** Hairline `border: 1px solid var(--line)`, `box-shadow: var(--panel-shadow)`, lit top edge
  (`border-top-color: var(--line-hi)`), corner ticks via `.panel::before/::after` (8 px L-shapes in `--tick`), radius `--radius`.
- [ ] **Step 4: Controls.** Segmented/primary buttons use `--btn-bg`/`--btn-text` for the selected state instead of red;
  `nav a.on` keeps `box-shadow: inset 0 -3px 0 var(--accent)`; remove red from `h2::before` (Task 3 restyles titles).
- [ ] **Step 5: Verify** — tests green (`node --test "tests/js/*.test.mjs"`, `uv run --extra render pytest -q`). Browser
  (serve `site/` with `%LOCALAPPDATA%\Programs\Python\Python312\python.exe -m http.server -d site 8765`, Claude in Chrome):
  home + car page, dark and light, desktop screenshot; iframe 390/320 px → `documentElement.scrollWidth <= innerWidth`.
- [ ] **Step 6: Commit** `feat(style): chrome surfaces — grain, logo, panels, silver controls`

### Task 3: Technical titles and bracket labels

**Files:**
- Modify: `site/style.css` (`h1`, `h2`, `.panel h2`, `.tier`, `.set`, `.badge`, caption `p.muted` before titles)
- Test: `tests/js/escape.test.mjs` (unchanged — DOM text must stay `S`/`Fast`), existing `ui.js` tests

**Interfaces:**
- Consumes: Task 1 tokens, Task 2 panel pseudo-elements (do not reuse them).
- Produces: `.tier` renders `[S]` purely via `::before { content: "[" } ::after { content: "]" }`, text colour `var(--s)` etc.,
  transparent background; `.set` small outlined mono tag. DOM text unchanged, so `aria-label`/`title` stay as they are.

- [ ] **Step 1:** Section titles: Barlow Condensed, `text-transform: uppercase`, `letter-spacing: var(--track-wide)`,
  `display: flex; align-items: center; gap` with `::after` hairline (`flex: 1; height: 1px; background: var(--line)`).
  `h2::before` red skew bar removed.
- [ ] **Step 2:** `.tier` → mono bracket label in tier colour (no fill; drop the `color: #111/#fff`); `.tower` border uses tier
  colour unchanged. `.set` → mono uppercase outlined tag, `--fs-xs`, tier-set colour.
- [ ] **Step 3:** Mono captions: the existing `.muted` line directly before a panel title (`.hero-meta`, `section > p.muted.small`)
  gets `font: var(--fs-xs) var(--mono); text-transform: uppercase; letter-spacing: .12em`. No new strings.
- [ ] **Step 4: Verify** — all test suites green; browser: home ranking, week guide, update page, tracks in both themes and
  EN/PT; check `[S]` is visible text via `getComputedStyle(el, '::before').content === '"["'` and that
  `el.textContent === 'S'`; 390/320 px no horizontal scroll.
- [ ] **Step 5: Commit** `feat(style): technical uppercase titles and [bracket] labels`

**Phase 1 gate:** whole-branch review of Tasks 1–3, Lighthouse a11y/SEO on home (if available), then STOP for the owner's
merge/push approval.

---

## Phase 2 — car hero

### Task 4: Car hero plate — glow, reflection, spec sheet, labels

**Files:**
- Modify: `site/js/pages/car.js` (hero markup in `carPage`, new exported helpers)
- Modify: `site/style.css` (`.car-hero`, `.hero-pic`, new `.spec`, `.hero-labels`; remove the red-stripe `::before` glow)
- Test: Create `tests/js/car.test.mjs`

**Interfaces:**
- Consumes: `html`, `num` from `site/js/format.js`; `carImg(id, size, alt, eager)` from `site/js/carimg.js`
  (returns the silhouette `<span class="car-sil">` when there is no picture); `t` from `site/js/i18n.js`.
- Produces:
  - `export const specSheet = (m, handling, t) => Html` — `m` = `hist[i].sets.m` (`power_ps, weight_kg, ps_per_t, pp, balance`),
    `handling` = `{low, high}` from `e.context.handling`. Renders a `<dl class="spec">` with six items:
    PS, kg, PS/t (1 decimal), PP (2 decimals), balance F:R, handling `low / high` (translated like the existing `hand()`).
    Missing values render `—`.
  - `export const heroPic = (id, hasImage) => Html` — `carImg(id, "l", "", true)` plus, only when `hasImage`, a second
    `carImg(id, "l")` wrapped in `<span class="reflection" aria-hidden="true">`.

- [ ] **Step 1: Write failing tests** in `tests/js/car.test.mjs` (stub `globalThis.document = { getElementById: () => null }`
  before importing, as `escape.test.mjs` does):
  - `specSheet({ power_ps: 476, weight_kg: 1260, ps_per_t: 377.8, pp: 687.78, balance: "52:48" }, { low: "N", high: "N" }, t)`
    contains `476`, `1,260` or `1260` (whatever `num` gives — assert `String(x).includes("476")` and `"687.78"` and `"52:48"`).
  - `specSheet({ power_ps: 476 }, {}, t)` contains `—` and does not contain `undefined` or `NaN`.
  - `heroPic("zz", false)` contains `car-sil` exactly once and no `reflection`; with `store.images = { a: [1280, 720] }`,
    `heroPic("a", true)` contains `class="reflection"` and `aria-hidden="true"`.
- [ ] **Step 2: Run** `node --test tests/js/car.test.mjs` — Expected: FAIL (`specSheet` is not exported).
- [ ] **Step 3: Implement** `specSheet` and `heroPic` in `car.js`; use them in the hero; add `<p class="hero-labels">` with
  `[GR.3] [MAKER] [DRIVETRAIN]` from `groupLabel(car.group)`, `car.maker`, `car.drivetrain` (bracket via CSS like Task 3).
  Remove the `#cards` "Specs" card duplicate only if the spec sheet shows the same values (keep balance/handling `ⓘ` info
  buttons by moving them next to the spec labels).
- [ ] **Step 4: CSS** — `.car-hero` black plate in both themes (re-declare dark tokens on `.car-hero`); image vertically
  centred with the text column (fixes the mockup's empty band); radial `--glow` under the car, 1 px floor line, reflection
  `transform: scaleY(-1)` with a fading `mask-image`, hidden under 700 px; title uses `--chrome` text with the same
  forced-colors fallback as Task 2; spec sheet mono grid, 3 columns ≥ 700 px, 2 below.
- [ ] **Step 5: Run** all suites — Expected: pass (the guard test must still pass: no untagged templates).
- [ ] **Step 6: Browser** — car pages `f-type-gr-3`, one silhouette car (find one with `store.images[id]` missing), and the
  longest-named car, in dark + light, desktop and iframe 390/320: no horizontal scroll, title wraps, no `undefined` in
  `#app.innerText`, reflection absent for the silhouette.
- [ ] **Step 7: Commit** `feat(car): chrome hero plate — glow, reflection, mono spec sheet, labels`

**Phase 2 gate:** review, then STOP for merge/push approval.

---

## Phase 3 — vertical Japanese text + polish

### Task 5: Decorative vertical text and polish pass

**Files:**
- Modify: `site/js/pages/car.js` (hero), `site/js/pages/week.js` (page heading area), `site/style.css`

**Interfaces:**
- Consumes: Task 4 hero structure.
- Produces: `<span class="vtext" aria-hidden="true">…</span>` — car hero: `グループ` + class number (`グループ3`) and `バランス`;
  week page: `デイリーレース` once. CSS `.vtext { writing-mode: vertical-rl; font-family: var(--jp) }`, `display: none` below 900 px.

- [ ] **Step 1: Test** — in `tests/js/car.test.mjs` add: the hero helper or markup that renders `.vtext` includes
  `aria-hidden="true"` (if built as a helper `vtext(text)`, test it directly).
- [ ] **Step 2: Implement** the labels; place `.vtext` in its own grid column/gutter so it can never overlap the image or
  spec sheet (Review Focus 5).
- [ ] **Step 3: Polish** — hover/focus states on chrome buttons (focus ring visible on `--btn-bg`), spacing consistency across
  home, week, updates, update, tracks, help in both themes.
- [ ] **Step 4: Verify** — all suites green; browser at desktop with `document.documentElement.style.fontSize = "200%"`:
  `.vtext` bounding box does not intersect `.hero-pic img` or `.spec`; 390/320 px: `.vtext` not displayed, no horizontal
  scroll; EN/PT; Lighthouse a11y/SEO 100 on home and a car page if available.
- [ ] **Step 5: Commit** `feat(style): vertical Japanese labels + polish`

**Phase 3 gate:** final whole-branch review, update `README.md` only if it describes the look, then STOP for merge/push approval.
