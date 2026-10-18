# Car images & "pit wall" redesign — design

Date: 2026-10-18 · Branch: `feat/car-images` · Scope: `site/`, `src/gt7bop/` (new image step), CI workflow.

## Goal
Make GT7 BoP Radar more appealing: every car shows its picture, and the site looks like motorsport broadcast
graphics ("pit wall / TV") while keeping today's identity (dark, red accent, Barlow Condensed).

Success criteria:
- ≥ 114 of 122 cars show their official GT7 picture on the live site; the rest show a neutral silhouette.
- No Sony/Polyphony image is ever committed to git (`site/`, `data/`, history).
- Accessibility and performance hold: Lighthouse a11y and SEO 100, CLS ≤ 0.1 on Home, Car and This week;
  contrast AA in both themes; 375 px width works; `prefers-reduced-motion` respected.

Out of scope: high-resolution "car shots", per-livery images, new pages, GSAP or any JS animation library.

## 1. Image source and legal posture
- Source: the official GT7 car list thumbnails,
  `https://www.gran-turismo.com/common/dist/gt7/carlist/car_thumbnails/car<GT7 ID>.png`
  (transparent PNG, 3/4 view, same style for every car).
- gran-turismo.com blocks hotlinking (HTTP 403 for foreign `Referer`). We do **not** work around that
  (no `referrerpolicy="no-referrer"` tricks). Instead the images are downloaded at **build time in CI only**,
  converted, and shipped inside `dist/` (the Pages artifact). They never enter git.
- Credit line "Car images © Polyphony Digital Inc. / Sony Interactive Entertainment" in the footer and on Help.
- Kill switch: building without `--images` removes every picture (silhouettes everywhere). A takedown request
  is handled by dropping the flag from the workflow — no history rewrite needed.

## 2. Mapping cars to GT7 IDs — `data/car_images.toml`
- `gt7bop images` (new command) reads `site/data/index.json` and gt7info's `cars.csv`
  (`https://raw.githubusercontent.com/ddm999/gt7info/web-new/_data/db/cars.csv`, columns `ID,ShortName,Maker`),
  matches by normalised name (lowercase, accents stripped, only `[a-z0-9]`), and writes
  `data/car_images.toml`: one `"<our car id>" = <GT7 ID>` line per car, sorted.
- Exact matches today: 114/122. Manual entries live in the same file under a `# manual` comment and are never
  overwritten; the command prints the cars still unmapped. Ambiguous names (two GT7 IDs) are reported, not guessed.
- The file is committed (it is our data, not Sony's). The weekly Action does not run `gt7bop images`; new cars
  after a BoP update are added by running it locally (the render logs unmapped cars).

## 3. Build step — `gt7bop render --images`
- For each mapped car: use `cache/car-images/<GT7 ID>.png` if present, else download it once (1 request per car,
  User-Agent identifying the project, 0.5 s pause between requests). The Action already caches `cache/`.
- Convert with Pillow (already the `render` extra) to WebP, two sizes keeping aspect ratio:
  `dist/img/cars/<id>-s.webp` (width 160, lists) and `dist/img/cars/<id>-l.webp` (width 480, car page).
- Any failure (HTTP error, bad image) is logged and that car falls back to the silhouette; the build never fails
  because of an image.
- The render writes `dist/data/images.json` = `{"<car id>": [w, h], …}` (large-size dimensions) for cars that have
  pictures. The SPA loads it with the index; the pre-rendered pages use it directly. `site/data/index.json` is
  unchanged, so the data pipeline and `gt7bop check` are untouched.
- Without `--images` (local builds, tests by default) no image is fetched and `images.json` is `{}`.
  When `images.json` is missing (quick dev server on `site/`), the SPA treats it as `{}` (silhouettes).
- Share images (OG) are unchanged in this iteration.

## 4. Front end
**Image helper** (`site/js/carimg.js`): `carImg(id, size, alt)` returns `<img>` with `src`, `width`/`height`
(from `images.json`, scaled), `loading="lazy"`, `decoding="async"` and an empty `alt` when the car name is already
next to it (decorative) — or the inline SVG silhouette (`aria-hidden`) when there is no picture. The silhouette is
one neutral GT-car side profile in `currentColor`, so it follows the theme.

**Where pictures appear:**
- Car page: hero header — large picture (480 px) over diagonal red stripes, car name in big condensed type,
  tier + position as a timing-tower block (`P1 / 52`), maker · drivetrain · class above.
- Lists with a picture per row (160 px, ~72 px displayed): home ranking (`rk-row`), home "most affected" cards,
  This week top-5 (and the #1 car featured larger on each A/B/C race card), update page rows (`urow`), track page
  rows (`trow`), search suggestions (small).

**Pit wall styling** (CSS only, existing tokens extended):
- Position number large and mono on the left of each row, on a narrow bar coloured by tier (S/A/B/C tokens).
- BoP deltas as broadcast "delta chips": ▲ green / ▼ red, mono numbers.
- Header: brand with a diagonal stripe and a red underline rule; section titles in uppercase condensed with a
  short red slash before them.
- Motion: rows and hero fade/slide in (≤ 250 ms, CSS `@keyframes`), disabled under `prefers-reduced-motion`.
- Light theme gets the same structure with its own token values; contrast checked by the existing contrast test.
- Pictures are transparent PNG→WebP, so they sit on the panel colour in both themes.

## 5. Pre-rendered pages
`render.py` uses the same markup for the car hero and list pictures in the pre-rendered bodies (from
`images.json`), so crawlers and the first paint show pictures and the SPA swap causes no layout shift.

## 6. Testing
- pytest: name normalisation and matching (incl. manual entries kept, ambiguous reported); render without
  `--images` ships no `img/` and `images.json == {}`; render with `--images` and a fake fetcher writes both
  sizes and `images.json`; a failing download falls back silently; nothing image-like is written under `site/`.
- JS tests (`node --test`): `carImg` with and without a picture (dimensions, lazy, alt, silhouette).
- Chrome: Home, Car, This week, Update and Track pages at 375 px and 1280 px, dark and light; console clean.
- Lighthouse on Home, Car, This week: a11y/SEO 100, CLS ≤ 0.1.
- Final design critique pass (`design:design-critique`) and fixes before merge.
