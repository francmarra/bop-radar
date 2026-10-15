# gt7-bop

**Gran Turismo 7 Balance of Performance tracker** for Gr.1, Gr.2, Gr.3 and Gr.4 cars.

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
| Rank / tier | PP within the group under each BoP set; S top 10 %, A ≤35 %, B ≤70 %, C rest |
| Verdict | average power-to-weight change over the BoP sets that changed: > +0.25 % buff, < −0.25 % nerf |
| Track fit | ½ PP rank + ½ the traits each track type rewards (PS/t, rotational G at 60/120/240 km/h, 100–150 km/h acceleration) |
| Strengths | top / bottom quarter of the group |
| Per-track rating | 70 % leaderboard pace on that layout (median of a car's best 20 laps vs. the event's 20 fastest, top 1000 laps; 6-month half-life, ×0.4 if the car's BoP changed since) + 30 % track-type fit; no data → fit × 0.85 |
| Tyre wear, fuel | **heuristic estimates** from weight, torque, drivetrain and power relative to the group |

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
