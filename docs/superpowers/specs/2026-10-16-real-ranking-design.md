# Class ranking from real pace — design

Date: 2026-10-16 · Branch: `feat/real-ranking` · Decided autonomously (Francisco: "automatiza-te").

## Problem
The home "Cars by class" ranking and every "Ranked N/M (tier)" sentence order cars by **PP under BoP**. PP is
Polyphony's formula, not pace. Measured on Gr.3 mid-speed tracks, the real fastest cars (Daily Race leaderboards)
sit 17th, 16th and 37th in our ranking; our #1 is 8th in reality. This undermines the site's credibility.

## Decision
Rank cars per class and BoP track type (h/m/l) by **real lap pace** where we have it, the model otherwise — the
same blend already used per track (`tracks.rate_combos`), aggregated over all tracks of that type.

`src/gt7bop/ranking.py`:
- `rank_by_pace(combos, groups) -> {gid: {car_id: {set: {"rank", "tier", "score", "source", "tracks", "laps"}}}}`
  - `groups`: the `rate_combos` input (cars with `id` and model `fit`).
  - For car c, set s: take every combo of type s where c has leaderboard evidence (`lb`). Weighted mean gap
    (weight = `lb.events`). If evidence covers ≥ `MIN_TRACKS = 2` layouts → `source="real"`,
    `score = 0.7·max(0, 1 − gap/3) + 0.3·fit[s]`; else `source="estimate"`, `score = 0.85·fit[s]`
    (constants identical to `rate_combos`, so per-track and per-class ratings agree).
  - Rank by score (ties: name), tiers by share (S ≤10 %, A ≤35 %, B ≤70 %, C rest — unchanged).
- Export: index cars' `sets[s]` become `{rank, tier, pp, pp_rank, source, tracks}`; `best_set` = set with the
  best rank; `brief.rank/tier/best_set` follow; cars sorted by new mid-speed rank. Car files get
  `now: {set: {...}}`. History entries keep their per-version PP ranks (labelled "PP rank" in the UI).
- `gt7bop evaluate`: leave-one-event-out backtest. For each Gr.3/Gr.4 event with ≥ 8 matched cars, rebuild
  ratings without that event, then Spearman ρ between predicted order (our rank for that track type) and the
  event's real order (gap). Also ρ for the PP ranking. Prints mean ρ for both; the result goes in the README.

## UI
- Ranking row: source badge next to the level — "Real pace (N tracks)" / "Estimate".
- `rank_note`, `help_level` and the Help glossary explain the method in plain words (EN/PT).
- Car page: header rank and summary sentence for the current version use `now`; the BoP-changes table column
  becomes "PP rank" (historical, honest).

## Testing
- pytest: `rank_by_pace` on a hand-built combos fixture — a car with strong real pace on 2 mid tracks outranks a
  higher-model car without data; 1 track only → estimate; tiers; weights by events.
- pytest: export wiring (index sets carry `source`, `pp_rank`; `best_set` follows rank).
- pytest: Spearman helper on known vectors; evaluate on a tiny synthetic event set.
- node: badge text + escaping; Chrome check; Lighthouse a11y stays 100.
