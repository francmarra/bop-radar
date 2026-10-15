# gt7-bop — design spec (2026-10-16)

A static website that tracks **Balance of Performance (BoP)** changes in Gran Turismo 7 for
**Gr.1, Gr.2, Gr.3 and Gr.4** cars, and gives every car, in every update, a short performance context
(track type it suits, straight-line vs cornering, estimated tyre wear and fuel use).

## Data sources
| Source | What | Licence / terms |
|---|---|---|
| [GT ENG!NE](https://gt-engine.com/gt7/) — `gt7/cars/grN/grN-01-specs.html` + `grN-02-archives*.html` | Per-car BoP values per game version (PP, power, torque, weight, balance, acceleration, stability, rotation G), split into High/Mid/Low-speed BoP sets, Old→New per update since 1.35 | No robots.txt. Credited and linked on every page; pages cached locally, fetched at most weekly with a 1.5 s delay |
| Official GT7 update notes | Context only (H/M/L BoP introduced in 1.19) | — |

Official notes do not list per-car BoP, so GT ENG!NE is the primary source.

## Pipeline (Python ≥3.12, stdlib only)
`gt7bop update` = fetch → parse → build → assess → write JSON.

1. **fetch** — download the specs and archive pages per group into `cache/` (follows `-archives-N` links).
2. **parse** — each `<h6>` "1.70 (2026-06-11) → 1.71 (2026-08-20)" opens a comparison; following
   `spec_updates_*{h,m,l}` tables belong to it. Header colspans (3 = Old/New/Δ, 5 = stability with flags)
   map data cells to metrics.
3. **build** — merge comparisons into a per-car history `version → set → metrics`. When a version has only
   one BoP set (sets were "common" before 1.61 for Gr.4), it is copied to H/M/L.
4. **assess** (per group, version, set):
   - PP rank in group and tier (top 10 % S, ≤35 % A, ≤70 % B, else C);
   - change vs previous version (ΔPP, Δpower, Δweight) → `buff` / `nerf` / `mixed` / `unchanged`;
   - strengths as group percentiles: straight line (PS/t), acceleration (100–150 km/h),
     low/high-speed cornering (rotation G 60/240), high-speed stability;
   - best track type = the BoP set (H/M/L) with the best rank, plus example tracks of that type;
   - **tyre wear** and **fuel use** = heuristic estimates (weight, drivetrain, torque / power vs group),
     clearly labelled as estimates;
   - a 1–3 sentence English summary.
   Optional hand-written notes in `data/notes/<slug>.toml` override/extend the context.
5. **write** — `site/data/index.json` (versions, groups, latest snapshot), `site/data/cars/<slug>.json`,
   `site/data/updates/<version>.json`.

## Site (static, no build)
`site/index.html` (latest update · update timeline · group rankings), `car.html?id=` (history chart +
context cards), `update.html?v=` (all changes in one update). Vanilla JS + inline SVG charts. English.

## Later
- GitHub Pages + weekly GitHub Action (`gt7bop update`, commit data, deploy).
- gt7-telemetry exports real tyre-wear/fuel per car → replaces the heuristic estimates.
