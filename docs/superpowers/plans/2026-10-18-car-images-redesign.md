# Car images & pit-wall redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the official GT7 picture of every car (downloaded at CI build time, never in git) and restyle the site as motorsport broadcast graphics.

**Architecture:** `gt7bop images` maps our car ids to GT7 ids into a committed `data/car_images.toml`. `gt7bop render --images` downloads/caches thumbnails, writes WebP files and `dist/data/images.json`. The SPA reads `images.json` through a small `carimg.js` helper; CSS gives the pit-wall look.

**Tech Stack:** Python 3.12 stdlib + Pillow (render extra) · vanilla ES modules · CSS · pytest · `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-18-car-images-redesign-design.md`

## Global Constraints
- Thumbnail URL: `https://www.gran-turismo.com/common/dist/gt7/carlist/car_thumbnails/car<GT7 ID>.png`. No `referrerpolicy` / hotlink workaround anywhere.
- No image from Sony/Polyphony under `site/`, `data/` or in git; downloads go to `cache/car-images/` (gitignored), output only to `dist/`.
- Output files: `dist/img/cars/<id>-s.webp` (width 160) and `dist/img/cars/<id>-l.webp` (width 480); `dist/data/images.json` = `{"<id>": [w, h]}` of the large file.
- Credit copy (EN): `Car images © Polyphony Digital Inc. / Sony Interactive Entertainment`; (PT): `Imagens dos carros © Polyphony Digital Inc. / Sony Interactive Entertainment`.
- Downloads: 1 request per uncached car, `User-Agent: gt7-bop-radar (+https://github.com/francmarra/bop-radar)`, 0.5 s pause between requests.
- An image problem never fails the build or the page: fall back to the silhouette.
- No new runtime JS dependency; motion is CSS only and off under `prefers-reduced-motion: reduce`.
- Keep: AA contrast both themes (existing `tests/js/contrast.test.mjs`), 18 px base text, 375 px without horizontal scroll, Lighthouse a11y/SEO 100, CLS ≤ 0.1.

## Review Focus
- Mapped car whose download returns 404/500 or non-image bytes → silhouette, build continues, one log line (Task 2 test `test_failed_download_falls_back`).
- Corrupt PNG already in `cache/car-images/` → deleted and treated as a failed download, not a crash (Task 2 test `test_corrupt_cache_is_discarded`).
- New car appears after a BoP update and is not in `car_images.toml` → silhouette; render logs `images: N cars unmapped` (Task 2 test `test_unmapped_car_is_logged`).
- `images.json` missing (dev server on `site/`) → SPA shows silhouettes, no error panel (Task 3 test `getImages falls back to empty`).
- 375 px with long names + thumbnails → no horizontal scroll, name wraps (Task 5 Chrome check, `document.documentElement.scrollWidth <= 375`).

---

### Task 1: Car → GT7 id mapping (`gt7bop images`)

**Files:**
- Create: `src/gt7bop/carimages.py`, `tests/test_carimages.py`, `data/car_images.toml`
- Modify: `src/gt7bop/cli.py` (new `images` subcommand)

**Interfaces:**
- Produces: `normalise(name: str) -> str`; `match_ids(cars: list[dict], gt7_csv: str) -> tuple[dict[str, int], list[str], list[str]]` (mapped, unmapped car ids, ambiguous car ids); `read_mapping(path: Path) -> dict[str, int]`; `update_mapping(path: Path, cars: list[dict], gt7_csv: str) -> tuple[list[str], list[str]]` (still-unmapped, ambiguous).
- File format of `data/car_images.toml`: header comment, generated `"<id>" = <int>` lines sorted by id, then a line `# manual` followed by hand-kept lines. `update_mapping` rewrites only the part above `# manual`, never emits an id already listed under it.

- [ ] **Step 1: Write failing tests** in `tests/test_carimages.py`:
  - `test_normalise`: `normalise("Lancer Evolution Final Gr.3") == "lancerevolutionfinalgr3"`, `normalise("Citroën GT '08") == "citroengt08"`.
  - `test_match_exact_and_ambiguous`: csv `"ID,ShortName,Maker\n2160,Genesis Gr.3,16\n1,Twin,1\n2,Twin,2\n"`, cars `[{"id":"genesis-gr-3","name":"Genesis Gr.3"},{"id":"twin","name":"Twin"},{"id":"x","name":"Nope"}]` → `({"genesis-gr-3": 2160}, ["x"], ["twin"])`.
  - `test_update_keeps_manual`: file with `# manual\n"x" = 99\n`; after `update_mapping` → `read_mapping` gives `{"genesis-gr-3": 2160, "x": 99}`, returned unmapped `[]` (x is manual), and the text below `# manual` is byte-identical.
- [ ] **Step 2:** `uv run pytest -q tests/test_carimages.py` → FAIL (module missing).
- [ ] **Step 3:** Implement the four functions in `src/gt7bop/carimages.py` (`csv.DictReader`, `unicodedata.normalize("NFKD")`, `tomllib`). Add CLI `images` (help: `map cars to GT7 ids -> data/car_images.toml`): downloads gt7info `cars.csv` from `https://raw.githubusercontent.com/ddm999/gt7info/web-new/_data/db/cars.csv`, calls `update_mapping` with all cars of `site/data/index.json`, prints `images: <n> mapped, unmapped: …, ambiguous: …`.
- [ ] **Step 4:** Tests pass; `uv run ruff check src tests` clean.
- [ ] **Step 5:** Create `data/car_images.toml` with this manual section, then run `uv run gt7bop images` → expect `122 mapped, unmapped: none, ambiguous: none`:
  ```toml
  # manual
  "genesis-x-gran-racer-vgt-concept" = 3544
  "lancer-evolution-final-edition-gr-3" = 2185
  "mercedes-amg-gt3-20" = 3531
  "m3-gt3-11" = 1904
  "gt-race-car-18" = 3436
  "suzuki-vgt-gr-3" = 3508
  "gt-lm-race-car-spec-ii" = 1040
  "gt-lm-spec-ii-test-car" = 1425
  ```
- [ ] **Step 6:** Commit `feat(images): map cars to GT7 ids`.

### Task 2: Build step — download, convert, `images.json`

**Files:**
- Modify: `src/gt7bop/carimages.py`, `src/gt7bop/render.py` (`render` signature, car page body), `src/gt7bop/cli.py` (`render --images`), `.github/workflows/update.yml` (add `--images` to the render step), `tests/test_carimages.py`, `tests/test_render.py`

**Interfaces:**
- Consumes: `read_mapping` (Task 1).
- Produces: `build_images(mapping: dict[str, int], out: Path, cache: Path, fetch: Callable[[str], bytes] = _get, log=print, pause: float = 0.5) -> dict[str, list[int]]` writing `out/<id>-s.webp`, `out/<id>-l.webp`, returning `{id: [w, h]}` of the large file. `render(site, out, site_url=SITE_URL, og=True, goatcounter=None, car_images: dict[str, int] | None = None, image_cache: Path | None = None, fetch=None) -> list[str]`: when `car_images` is given, calls `build_images` into `out/img/cars` and logs `images: <n> cars unmapped` for index cars missing from the mapping; always writes `out/data/images.json` (`{}` without images).
- Pre-rendered car page body starts with `<img src="{prefix}img/cars/<id>-l.webp" width=W height=H alt="<car name>">` when the car has a picture.

- [ ] **Step 1: Failing tests** (fake `fetch` returns PNG bytes made with Pillow `Image.new("RGBA", (330, 180))`, `pause=0`):
  - `test_build_images_sizes`: both files exist; large width 480, small width 160, aspect kept; return value `{"a": [480, 262]}`; second call with a fetch that raises downloads nothing (cache hit).
  - `test_failed_download_falls_back`: fetch raises `HTTPError` for one id → that id absent from the result, others present, no exception.
  - `test_corrupt_cache_is_discarded`: `cache/<gt7id>.png` contains `b"junk"` and fetch raises → id absent, junk file deleted.
  - `test_render_without_images` (test_render.py): no `dist/img/`, `json.loads(dist/data/images.json) == {}`, and no `*.webp`/`*.png` under the test `site/` after render.
  - `test_render_with_images`: `render(..., car_images={"genesis-gr-3": 2160}, image_cache=tmp, fetch=fake)` → `dist/img/cars/genesis-gr-3-l.webp` exists, `images.json` has it, car page HTML contains `img/cars/genesis-gr-3-l.webp" width="480"`.
  - `test_unmapped_car_is_logged`: same render with `capsys` → output contains `images: 1 cars unmapped` (odd-car).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Large/small via `Image.thumbnail` on width (keep ratio), `save(..., "WEBP", quality=82, method=6)`. Corrupt cache = `PIL.UnidentifiedImageError`/`OSError` on open → unlink, log, skip. CLI `render --images` reads `ROOT/data/car_images.toml` and passes `image_cache=ROOT/"cache"/"car-images"`. Workflow render step gets `--images`.
- [ ] **Step 4:** All pytest + ruff green.
- [ ] **Step 5:** Real run: `uv run --extra render gt7bop render --out dist --site-url http://127.0.0.1:8765/ --no-og --images` → `ls dist/img/cars | wc -l` = 244, `git status --short` shows no image files.
- [ ] **Step 6:** Commit `feat(images): download and convert car pictures at build time`.

### Task 3: Front-end image helper and credit

**Files:**
- Create: `site/js/carimg.js`, `tests/js/carimg.test.mjs`
- Modify: `site/js/data.js` (`getImages`), `site/js/main.js` (await images with index), `site/index.html` (footer credit span `data-t="img_credit"`), `site/js/i18n.js` (`img_credit` EN/PT, copy from Global Constraints), `site/js/pages/help.js` (credit paragraph after `privacy_text`)

**Interfaces:**
- Produces: `getImages(): Promise<Record<string, [number, number]>>` in data.js (`store.images`, failures → `{}`); `carImg(id: string, size: "s" | "l", alt = ""): string` in carimg.js — `<img class="car-img car-img-{size}" src="${BASE}img/cars/${id}-${size}.webp" width height loading="lazy" decoding="async" alt="…">` with dimensions from `store.images` (small = scaled to width 160, rounded), or `<span class="car-img car-img-{size} car-sil" aria-hidden="true"><svg …></svg></span>` when absent. Exported `SILHOUETTE` (inline SVG string, `fill="currentColor"`, viewBox `0 0 160 64`).

- [ ] **Step 1: Failing JS tests** (`tests/js/carimg.test.mjs`, set `store.images` directly; follow the import style of existing tests):
  - with `{"a": [480, 262]}`: `carImg("a","l","A")` contains `width="480" height="262"`, `loading="lazy"`, `alt="A"`, `img/cars/a-l.webp`; `carImg("a","s")` contains `width="160" height="87"` and `alt=""`.
  - without the id: returns a string containing `car-sil` and `aria-hidden="true"` and no `<img`.
  - alt is escaped: `carImg("a","l",'<b>"x"')` contains `&lt;b&gt;&quot;x&quot;`.
  - `getImages falls back to empty`: with `globalThis.fetch` stubbed to reject → resolves `{}`.
- [ ] **Step 2:** `node --test "tests/js/*.test.mjs"` → FAIL.
- [ ] **Step 3:** Implement; `route()` awaits `Promise.all([getIndex(), getImages()])`.
- [ ] **Step 4:** JS tests (incl. i18n key-parity test) green.
- [ ] **Step 5:** Commit `feat(site): car image helper and image credit`.

### Task 4: Pictures in pages + pit-wall styling

**Files:**
- Modify: `site/js/pages/car.js` (hero), `site/js/pages/home.js` (ranking `rk-row`, most-affected cards), `site/js/week.js` + `site/js/pages/week.js` (top-5 rows, #1 featured on race cards), `site/js/pages/updates.js` (`urow`), `site/js/pages/tracks.js` (`trow`), `site/js/search.js` (suggestions, small), `site/style.css`

**Interfaces:**
- Consumes: `carImg` (Task 3). List rows use `carImg(id, "s")` with empty alt (name is beside it); car hero uses `carImg(id, "l", car.name)`; week #1 featured uses `"l"`.

- [ ] **Step 1:** Car page hero: wrapper `.car-hero` (picture right on desktop, top on ≤ 700 px) over a `repeating-linear-gradient` diagonal red stripe band; meta line (class · maker · drivetrain) uppercase condensed; name at `--fs-h1` × 1.4; tier + rank as `.tower` block (`P1` big mono, `/ 52` muted).
- [ ] **Step 2:** List rows: add a picture column (72 px wide display, `object-fit: contain`) after the rank; rank cell becomes `.pos` (mono, `--fs-lg`) with a 4 px left bar coloured by tier token (`--s/--a/--b/--c`); deltas rendered as `.delta.up` / `.delta.down` chips. Update the `grid-template-columns` of `.row`, `.trow`, `.urow` accordingly; ≤ 700 px card layout keeps the picture top-left.
- [ ] **Step 3:** Header/sections: brand diagonal stripe + 2 px `--accent` rule under the header; `h2` uppercase condensed with a `::before` red slash. Keyframes `rise` (opacity 0→1, translateY 6px→0, 220 ms) on `.row`, `.car-hero`; `@media (prefers-reduced-motion: reduce)` sets `animation: none`.
- [ ] **Step 4:** `node --test` (contrast test must still pass with any new tokens) + `uv run pytest -q` green.
- [ ] **Step 5:** Local build with `--images`, serve `dist/`, Chrome at 1280 px and 375 px, dark and light: Home, Car, This week, Update, Track render pictures; silhouettes for a car removed from `images.json` by hand in devtools; `scrollWidth <= innerWidth` at 375 px; console clean.
- [ ] **Step 6:** Commit `feat(site): car pictures and pit-wall styling`.

### Task 5: Verification, critique and fixes

**Files:** whatever the fixes touch.

- [ ] **Step 1:** Lighthouse (chrome-devtools `lighthouse_audit`) on Home, Car (`car/genesis-gr-3/`), This week of the local `dist/` → a11y 100, SEO 100, CLS ≤ 0.1. Fix and re-run until met.
- [ ] **Step 2:** Run the `design:design-critique` skill on screenshots of Home, Car and This week (desktop + mobile); apply fixes that keep the constraints; re-check Step 1.
- [ ] **Step 3:** Full suite: `uv run ruff check src tests && uv run --extra render pytest -q && node --test "tests/js/*.test.mjs"` all green.
- [ ] **Step 4:** Update README (commands `gt7bop images`, `render --images`, image credit/legal note) and commit `docs: car images`.
- [ ] **Step 5:** Stop for merge/push approval.
