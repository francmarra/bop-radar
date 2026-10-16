# GT7 BoP Radar

**Gran Turismo 7 Balance of Performance radar** for Gr.1, Gr.2, Gr.3 and Gr.4 cars — live at **https://francmarra.github.io/bop-radar/**

Every BoP update since version 1.15, with a verdict per car (buff / nerf / mixed) and a short
performance context: which track type it suits (high-, mid- or low-speed BoP), strengths and
weaknesses, estimated tyre wear and fuel use. **Pick a track** to see the best cars for that
layout, rated from real Daily Race leaderboard pace. English and Portuguese UI.

- `src/gt7bop/` — Python (stdlib only) pipeline: fetch → parse → build history → assess → JSON
- `site/` — static site (vanilla JS, no build step) reading `site/data/`
- `data/leaderboards/<board>.json` — per-car pace aggregates of finished Daily Races (no player data)
- `data/notes/<car-id>.toml` — optional hand-written notes shown on a car's page (`text = "..."`)

## Usage

```sh
uv sync
uv run gt7bop update            # fetch missing pages, rebuild site/data
uv run gt7bop update --refresh  # re-download the live pages (new game version)
uv run gt7bop update --offline  # rebuild from cache only
uv run gt7bop leaderboards --pages 26  # aggregate the last ~52 weeks of Daily Races (incremental)
uv run pytest
py -m http.server -d site 8765  # open http://127.0.0.1:8765
```

## How cars are assessed

| Output | Method |
|---|---|
| Rank / level | per class and BoP track type: **real pace** from Daily Race leaderboards on every layout of that type (≥ 2 layouts with ≥ 10 laps under the current BoP; same 70/30 blend as the per-track rating; unproven cars capped at the median), otherwise the model estimate; S top 10 %, A ≤35 %, B ≤70 %, C rest. PP rank is kept for reference |
| Verdict | average power-to-weight change over the BoP sets that changed: > +0.25 % buff, < −0.25 % nerf |
| Track fit | ½ PP rank + ½ the traits each track type rewards (PS/t, rotational G at 60/120/240 km/h, 100–150 km/h acceleration) |
| Strengths | top / bottom quarter of the group |
| Per-track rating | 70 % leaderboard pace on that layout (median of a car's best 20 laps vs. the event's 20 fastest, top 1000 laps; 6-month half-life, ×0.4 if the car's BoP changed since) + 30 % track-type fit; no data → fit × 0.85 |
| Tyre wear, fuel | **heuristic estimates** from weight, torque, drivetrain and power relative to the group |

### Does it work? (backtest)

`uv run gt7bop evaluate` predicts each Gr.3/Gr.4 Daily Race (≥ 8 matched cars) using **only earlier races** and BoP
changes already released at the time, then compares the predicted order with the real one (Spearman ρ):

| Ranking | mean ρ (40 events) | better in |
|---|---|---|
| Real-pace ranking (this site) | **+0.25** | 65 % of events |
| PP under BoP (the usual proxy) | +0.14 | 35 % |

Rules (chosen up front, then checked against 17 alternatives — none scored higher): a layout counts as evidence
with ≥ 10 laps under the car's current BoP; "real pace" needs ≥ 2 layouts; cars with no evidence are capped at the
median real-pace score. Caveats: 40 events is a small, noisy sample; car model fit and PP ranks in the backtest are
today's values, not the historical ones; in the top 1000 laps a few meta cars hold most laps, so many cars have little
evidence. Deeper and older leaderboard data is the main lever for accuracy.

## Data & credits

- BoP values: [GT ENG!NE](https://gt-engine.com/gt7/) car-spec pages and archives (cached locally,
  fetched politely, at most weekly). Where the source's "Old" values disagree with its previous "New"
  values, the change shows up as *mixed*.
- Leaderboards: official Daily Race rankings via [gtsh-rank.com](https://gtsh-rank.com/daily/) — only
  car/lap-time aggregates are stored.
- Track → BoP set: [ddm999/gt7info](https://github.com/ddm999/gt7info) (MIT-0).
- Unofficial fan project, not affiliated with Polyphony Digital or Sony Interactive Entertainment.

## Roadmap

- Replace the tyre/fuel estimates with real per-car data exported from
  [gt7-telemetry](https://github.com/francmarra).

MIT licence.
