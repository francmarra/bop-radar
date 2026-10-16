# Daily Race guide ("This week") — design

Date: 2026-10-16 · Branch: `feat/daily-guide` (from `feat/ux-a11y`) · Sub-project C of the "best GT7 site" roadmap.

## Context & goal
Roadmap (agreed): C Daily Race guide → A My garage + alerts → E shareable cards → D BoP balance index → B comparator → G languages / H PWA / F real tyre & fuel.
Constraint: static site, free (GitHub Pages + GitHub Action). No backend.

Competitors (DG-EDGE, GTPlanet, Traxion) publish hand-written weekly Daily Race articles. Nobody generates a guide
automatically from the current BoP. Goal: every week, without manual work, show each Daily Race (this week and next)
with its rules in plain language and, for Gr.1–4 races, the best cars and why — for players of all ages.

Success: the guide updates itself twice a week; a visitor sees this week's A/B/C races and a recommended car in
one glance from the home page; every claim says whether it comes from real lap times or a model estimate.

## 1. Data
New CLI command `gt7bop week` (in the weekly Action, after `gt7bop update`):
- Reads `https://gtsh-rank.com/daily/` (page 1 only; current cards and cards marked `is-next`). One request, same
  User-Agent and politeness as `leaderboards.py`.
- New parser `parse_schedule(html) -> list[dict]` in `src/gt7bop/week.py` (does not change `parse_week_page`, which
  keeps feeding leaderboard aggregation). Per card: `race` (A/B/C), `week` ("this" | "next" from `is-next`),
  `start`/`end` dates when present, `track`, `course_id`, `category` text, `kind`, `car` (one-make only), `tyres`,
  `fuel`, `tyre_wear`, `bop` (On/Off).
  - `kind = "bop"`: category in Gr.1–4 and BoP On.
  - `kind = "one-make"`: category marked `is-specified` (car name taken from the card).
  - `kind = "other"`: anything else (road cars, N-class, Gr.B, BoP Off).
  - `kind = "tbd"`: next-week cards (gtsh-rank shows no class for them, only track, rules and start date).
  - Current cards also show the leaderboard leader (player name + car). Only the car is read (used as the one-make
    car); the player name is never parsed or stored. The test fixture is anonymised before commit.
- `build_week(schedule, combos, cars_index) -> dict`: for `bop` races, find the combo for
  `track_id(track)` + group in the output of `rate_combos` and take the top 5 cars: `id`, `name`, `tier`,
  `source` ("real" with lap count when `lb` exists, else "estimate"), `why` (strengths that matter on this track type,
  plus a tyre note when `tyre_wear` ≥ x4 and the car's estimated tyre wear is low). No combo → `cars: []`.
- Output `site/data/week.json`:
  `{ generated, weeks: [{ label: "this"|"next", races: [{ race, start, end, track, track_set, group, kind, car, tyres, fuel, tyre_wear, cars: [...] }] }] }`.
- Aggregates only; no player names or ids.
- On network/parse failure the previous `week.json` is left untouched and the command exits non-zero only for
  logging (the Action continues with `update`).
- Action schedule: Monday and Thursday. `gt7bop week` runs after `gt7bop update` and reads `site/data/tracks.json`
  (the exported `rate_combos` output) and `site/data/index.json` (car names, tiers, strengths, tyre wear).

## 2. Interface
**Home strip** (below the car search): heading "This week's Daily Races"; three compact cards (letter, track, class;
for `bop` races "Best bet: <car>"); link "See the full guide →". Hidden if `week.json` is missing or empty.
Cards stack on mobile.

**Page `#/week`** (nav: Home · This week · BoP updates · Help):
- Toggle This week | Next week (`aria-pressed`).
- One card per race: big letter, track, class, dates; rules line in words + icons
  ("Tyres: Racing Hard and Racing Soft · Fuel ×2 · Tyre wear ×5"), ⓘ on fuel and tyre-wear multipliers.
  - `bop`: "Top 5 cars": level badge, car name (link to car page), one-line why, source badge
    ("Real lap times (968 laps)" / "Estimate").
  - `one-make`: "Everyone drives the same car: <car>" (link when the car is in the index).
  - `other`: "BoP does not apply to this race. Pick any car within the PP limit."
  - `tbd`: "Class is announced when the race starts. Check back on <date>." 
  - "Copy summary" button: plain text for Discord/Reddit, e.g.
    `GT7 Daily Race C · Daytona Road Course · Gr.3 → best: Jaguar F-type Gr.3, … — bop-radar: <url>`.
- Next week empty: "Next week's races aren't out yet. They usually appear mid-week."
- Tyre codes mapped to words (RH → Racing Hard, RM → Racing Medium, RS → Racing Soft, IM → Intermediate,
  W → Wet, CH/CM/CS → Comfort, SH/SM/SS → Sports), EN and PT.
- All strings EN + PT; all data through `esc()`; same accessibility bar as `feat/ux-a11y` (44 px targets, AA contrast).

## 3. Errors, testing, delivery
- `week.json` load failure: home strip not rendered; `#/week` shows the standard error with "Try again".
- Track with no combo: "No data for this track yet."
- Copy: `navigator.clipboard.writeText`; on failure, show the text selected in a read-only textarea.
- pytest: `parse_schedule` on a saved real HTML fixture (`tests/fixtures/gtsh_daily.html`) covering this/next, bop,
  one-make, other; `build_week` top 5 + source + why; failure keeps the old file.
- node tests: rules sentence, tyre names, summary text, escaping of `week.json` strings.
- Chrome: desktop, 375 px, keyboard; Lighthouse accessibility stays 100 on `#/` and `#/week`.
- Merge of `feat/ux-a11y` and `feat/daily-guide` to `main` only after Francisco's OK.
