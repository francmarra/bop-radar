# Pre-render, SEO & Share Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real, indexable URLs with per-page meta, crawlable content and share images.
**Architecture:** JS router switches to paths (base from `import.meta.url`); Python `render.py` builds `dist/` (pages, sitemap, 404, OG PNGs via optional Pillow); CI uploads `dist`.
**Tech Stack:** Python stdlib (+ optional Pillow), vanilla JS, node:test, pytest.
**Spec:** `docs/superpowers/specs/2026-10-16-seo-prerender-design.md`

## Global Constraints
- Core pipeline stays stdlib; Pillow only in optional group `render` (`[project.optional-dependencies] render = ["pillow"]`).
- Site URL default `https://francmarra.github.io/bop-radar/`; page paths end with `/`.
- Every value placed in generated HTML is `html.escape`d (quote=True); JSON-LD via `json.dumps` with `<` escaped as `<`.
- `dist/` gitignored; `site/` must keep working unrendered at `/` for dev.
- Tests: `uv run pytest -q`, `node --test "tests/js/*.test.mjs"`. Commits on `feat/seo-prerender`; merge only with OK.

## Review Focus
1. Hosted under `/bop-radar/` vs `/` → assets, data and links resolve at depth 0, 1, 2 (`car/x/`) — test in Task 2 + Chrome in Task 5.
2. Old shared `#/car/x` links → land on `car/x/` — Task 1 test + Chrome.
3. Car or version id with odd characters (`1.71`, accents) → valid paths and escaped meta — Task 2 test.
4. Ctrl/Cmd-click, middle click, external links → not intercepted — Task 1 test (`shouldIntercept`).
5. Pillow or font missing → render still succeeds with default image reference — Task 3 test.

---

### Task 1: Path router (JS)
**Files:** Create `site/js/router.js`, `tests/js/router.test.mjs`; Modify `site/js/main.js`, `site/js/data.js`, `site/js/search.js`, all `site/js/pages/*.js`, `site/js/week.js`, `site/index.html`
**Produces:** `basePath(moduleUrl) -> "/bop-radar/"`; `pathOf(pathname, base) -> ["car","x"]`; `hashToPath(hash) -> "car/x/" | null`; `link(path) -> base + path`; `shouldIntercept(event, anchor, origin, base) -> bool`; `navigate(path)`.
- [ ] Tests for all helpers incl. `hashToPath("#/update/1.71") === "update/1.71/"`, `hashToPath("#/") === ""`, intercept false for ctrl/meta/shift/button 1/target=_blank/other origin/outside base/download.
- [ ] Implement; replace every `#/…` href with `link("…/")` (or relative in index.html nav: `href="./"`, `week/`… resolved by JS on boot), `location.hash =` with `navigate`, `hashchange` with `popstate`; data `load` uses `BASE + "data/"`; skip-link unaffected.
- [ ] Chrome on unrendered `site/` at `/`: navigation, back/forward, `/#/car/genesis-gr-3` → `/car/genesis-gr-3/`. Commit `feat(site): path-based routing`.

### Task 2: `render.py` pages + sitemap + 404
**Files:** Create `src/gt7bop/render.py`, `tests/test_render.py`; Modify `src/gt7bop/cli.py`, `.gitignore`
**Produces:** `render(site: Path, out: Path, site_url: str, og: bool = True) -> list[str]` (page paths); `page_html(shell, depth, meta, body) -> str`.
- [ ] Tests on a tmp copy of `site/` + small data fixtures: files exist for home/updates/week/help/each car/each update; `<title>`, description, canonical `site_url + path`, og:image absolute; `../../style.css` at depth 2; sitemap count = pages; 404.html exists; meta escaped (`<` in a car name).
- [ ] Implement + CLI `gt7bop render --out dist --site-url …`; `.gitignore` adds `dist/`. Commit `feat(render): pre-rendered pages and sitemap`.

### Task 3: Share images
**Files:** Modify `src/gt7bop/render.py`, `pyproject.toml`; Test `tests/test_render.py`
- [ ] Tests: with Pillow (`pytest.importorskip("PIL")`) `og/default.png`, one update and one car image are 1200×630 PNG; with `og=False` pages reference `og/default.png`.
- [ ] Implement cards (dark theme, accent bar, big title, 2–3 lines); fonts DejaVu/Arial/fallback. Commit `feat(render): share images`.

### Task 4: CI + docs
- [ ] Workflow: render step, upload `dist`; README dev instructions (`gt7bop render --out dist --site-url http://127.0.0.1:8000/` + serve `dist`). Commit `ci: build and deploy pre-rendered dist`.

### Task 5: Verification + final review
- [ ] Build dist locally with local site URL, Chrome checks (Review Focus 1,2,4), Lighthouse SEO/a11y; full suites; independent review; fix pass.
