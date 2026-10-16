# Daily Race Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A self-updating "This week" Daily Race guide (page + home strip) built from gtsh-rank's schedule and our existing per-track ratings.

**Architecture:** New `src/gt7bop/week.py` parses gtsh-rank `/daily/` page 1 and joins each race with `site/data/tracks.json`
and `site/data/index.json` into `site/data/week.json` (CLI `gt7bop week`, run after `update`). The SPA gets a DOM-free
`site/js/week.js` (texts) and a page module `site/js/pages/week.js`, plus a strip on the home page.

**Tech Stack:** Python 3.12 stdlib + pytest; vanilla JS ES modules + `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-16-daily-guide-design.md`

## Global Constraints
- Static + free: no backend; one request to `https://gtsh-rank.com/daily/` per run, existing User-Agent from `leaderboards.py`.
- Never parse or store player names/ids (`data-driver-name`, avatars, tokens, visible leader names). Only `data-car-name`.
- The committed fixture `tests/fixtures/gtsh_daily.html` must contain no real player names.
- `kind` ∈ `"bop" | "one-make" | "other" | "tbd"`; `week` label ∈ `"this" | "next"`.
- All UI strings EN + PT (Portugal); all data via `esc()`; ids in hrefs via `encodeURIComponent`; enums whitelisted.
- Accessibility bar of `feat/ux-a11y`: ≥44 px targets, AA contrast tokens, keyboard, Lighthouse a11y 100.
- JS tests: `node --test "tests/js/*.test.mjs"`; Python: `uv run pytest -q`.
- Commit per task on `feat/daily-guide`; no merge/push without Francisco's OK.

## Review Focus
1. gtsh-rank markup changes / page unreachable → `week.json` untouched, Action continues; covered in Task 2.
2. Track name with accents or mojibake ("Autódromo de Interlagos") → still matches the `tracks.json` combo via `track_id`; test in Task 1.
3. One-make car not in our index (road car) → plain text, no broken link; test in Task 3.
4. `week.json` with an empty "next" week → friendly message, no empty grid; check in Task 4.
5. Clipboard blocked (non-HTTPS / permissions) → selectable textarea fallback; check in Task 4.

---

### Task 1: Parse the schedule (`parse_schedule`) + anonymised fixture

**Files:** Create `src/gt7bop/week.py`, `tests/test_week.py`; Modify `tests/fixtures/gtsh_daily.html` (already downloaded, untracked)

**Interfaces (Produces):** `parse_schedule(html: str) -> list[dict]`, each
`{"race": "A", "week": "this"|"next", "start": "2026-10-19"|None, "track": str, "course_id": str, "category": str, "kind": str, "car": str|None, "tyres": [str], "fuel": "x2", "tyre_wear": "x4", "bop": bool}`.
Rules: `week="next"` when the article class contains `is-next`; `start` from `href="/daily/week/(\d{4}-\d{2}-\d{2})/"`;
`category` from `class="daily-category…">TEXT<`; `kind`: next-week → `tbd`; `is-specified` → `one-make`
(`car` = `data-car-name`); category in Gr.1–4 and BoP On → `bop`; else `other`. `car` is set only for one-make.
Track text HTML-unescaped (`html.unescape`).

- [ ] **Step 1:** Anonymise the fixture: a throwaway script in the scratchpad replaces every `data-driver-name="…"` value and each occurrence of those names in the file with `Player`, and blanks `data-avatar` / `data-token` values. Verify: `grep -c 'data-driver-name="Player"' tests/fixtures/gtsh_daily.html` equals the number of current cards (3) and the original names no longer appear.
- [ ] **Step 2:** `tests/test_week.py`: `parse_schedule(fixture)` returns 6 races; next-week ones: `week=="next"`, `kind=="tbd"`, `start=="2026-10-19"`, tracks `["Circuit Gilles-Villeneuve", "Autódromo de Interlagos", "Suzuka Circuit"]`, Suzuka has `fuel=="x2"`, `tyre_wear=="x4"`, `tyres==["RM"]`; current A: `kind=="one-make"`, `car=="Gran Turismo Red Bull X2014 Junior"`; current B: `kind=="bop"`, `category=="Gr.3"`, `car is None`; current C: Gr.4, `tyres==["RM","RS"]`; no value anywhere equals `"Player"` (names never parsed).
- [ ] **Step 3:** `uv run pytest -q tests/test_week.py` → FAIL (module missing).
- [ ] **Step 4:** Implement `parse_schedule` (reuse `ARTICLE_RE`-style regex but capture the class; `_find` from leaderboards).
- [ ] **Step 5:** pytest → PASS. Commit `feat(week): parse Daily Race schedule` (fixture included).

### Task 2: Build `week.json` + CLI + Action

**Files:** Modify `src/gt7bop/week.py`, `src/gt7bop/cli.py`, `.github/workflows/*.yml`; Test `tests/test_week.py`

**Interfaces (Produces):**
- `build_week(schedule: list[dict], tracks: list[dict], index: dict, generated: str) -> dict` →
  `{"generated", "weeks": [{"label": "this", "races": [...]}, {"label": "next", "races": [...]}]}`; race =
  schedule fields minus `bop`/`category` plus `group` (gr1–gr4 or None), `track_set` (from the combo, else `track_set(track)`),
  `cars` (bop only, ≤5): `{"id", "name", "tier", "source": "real"|"estimate", "laps": int|None, "why": {"strengths": [str], "saves_tyres": bool}}`.
- Combo lookup: `track_id(race["track"])` against `tracks[*].id`, then `groups[group].cars` (already sorted by score).
- `why.strengths` = car `brief.strengths` ∩ `SET_STRENGTHS[set]`, where `SET_STRENGTHS = {"h": ["straight-line speed", "high-speed cornering"], "m": ["high-speed cornering", "acceleration"], "l": ["low-speed cornering", "acceleration"]}`; `saves_tyres` = race `tyre_wear` multiplier ≥ 4 and car `brief.tyre_wear == "low"`.
- `update_week(out: Path, fetch=_get, log=print) -> bool`: fetch page 1, parse, build, write `out/week.json`; any exception → log, leave file, return False.
- CLI `gt7bop week` → `update_week(ROOT / "site" / "data")`.

- [ ] **Step 1:** Tests: with a 2-track `tracks` fixture dict and 3-car `index` built inline, `build_week` puts current B (Spa, gr3) cars in score order, ≤5, `source=="real"` and `laps` from `lb.laps` when `lb`, else `"estimate"`/`None`; Interlagos with "Autódromo"/"Autodromo" spelling matches the same combo; race with no combo → `cars==[]`; one-make/other/tbd → `cars==[]`, `group` None for non-Gr; `saves_tyres` true only when wear x4+ and car wear low. `update_week` with a `fetch` that raises leaves an existing `week.json` byte-identical and returns False.
- [ ] **Step 2:** pytest → FAIL; implement; pytest → PASS (whole suite).
- [ ] **Step 3:** CLI subcommand; workflow: cron Monday **and** Thursday, step `uv run gt7bop week` after `update`, `git add site/data/week.json` included. Run `uv run gt7bop week` locally → `site/data/week.json` written with 2 weeks; inspect `py -c` that `weeks[0].races` has 3 races.
- [ ] **Step 4:** Commit `feat(week): build week.json and schedule it twice a week`.

### Task 3: Week texts (DOM-free) + strings

**Files:** Create `site/js/week.js`, `tests/js/week.test.mjs`; Modify `site/js/i18n.js`

**Interfaces (Produces):** `tyreName(code, t) -> string` (RH/RM/RS/IM/W/CH/CM/CS/SH/SM/SS → `t("tyre_" + code)`, unknown → escaped code);
`rulesText(race, t) -> string` e.g. EN `"Tyres: Racing Hard and Racing Soft · Fuel ×2 · Tyre wear ×5"` (×1 parts omitted; tyres joined with "and"/"e");
`whyText(why, t) -> string` (strengths via `I18N[lang].tr`, plus `t("saves_tyres")`, joined "; ");
`summaryText(race, url, t) -> string` e.g. `"GT7 Daily Race C · Daytona Road Course · Gr.3 → best: A, B, C — bop-radar: <url>"` (top 3; non-bop omits "→ best").
`carLink(index, car) -> string`: link when id/name found in index, else escaped text.

- [ ] **Step 1:** Tests: EN/PT `rulesText` for `{tyres:["RH","RS"], fuel:"x2", tyre_wear:"x5"}` and for all-×1 (`"Tyres: Racing Medium"`); `tyreName("ZZ")` → `"ZZ"`; `whyText({strengths:["low-speed cornering"], saves_tyres:true})` EN `"low-speed cornering; saves tyres"`; `summaryText` exact strings for bop and other; `carLink` with an unknown car returns no `<a`; escaping: a track named `<img>` never appears unescaped in `summaryText`-based HTML helpers.
- [ ] **Step 2:** Run → FAIL; implement + EN/PT strings (`nav_week`, `week_title`, `this_week`, `next_week`, `top5`, `best_bet`, `see_guide`, `src_real(n)`, `src_est`, `one_make(car)`, `other_race`, `tbd_race(date)`, `next_empty`, `no_track_data`, `copy`, `copied`, `tyre_*`, `saves_tyres`, `help_fuel_x`, `help_wear_x`, `term_fuel_x`, `term_wear_x`); run → PASS. Commit `feat(site): week texts in EN/PT`.

### Task 4: `#/week` page, nav, home strip

**Files:** Create `site/js/pages/week.js`; Modify `site/js/main.js`, `site/index.html`, `site/js/pages/home.js`, `site/style.css`

- [ ] **Step 1:** `weekPage(app)`: loads `week.json` via `load`; toggle This/Next (`aria-pressed`); cards per spec §2 using Task 3 helpers, `tierBadge`, `info("fuel_x")`/`info("wear_x")`; "Copy summary" → `navigator.clipboard.writeText`, on reject replace button with a read-only `<textarea>` pre-selected; empty next week → `next_empty`. Route `#/week`; nav order Home · This week · BoP updates · Help.
- [ ] **Step 2:** Home strip under the search: 3 compact cards from `weeks[0]` (letter, track, class, best bet), link `#/week`; wrapped in try/catch so a missing `week.json` renders nothing.
- [ ] **Step 3:** Chrome (local server): `#/week` both tabs, a bop card links to a car page, copy works, home strip shows 3 cards; 375 px no horizontal scroll; keyboard reaches toggle, links, copy. Delete `week.json` temporarily (rename) → home renders without strip, `#/week` shows error + retry; restore it.
- [ ] **Step 4:** `node --test` + pytest green. Commit `feat(site): This week page and home strip`.

### Task 5: Final verification
- [ ] Lighthouse accessibility (mobile) on `#/` and `#/week` = 100; full suites green; report to Francisco and stop (merge only after OK).
