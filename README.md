# GT7 BoP Radar

**Gran Turismo 7 Balance of Performance radar** for Gr.1, Gr.2, Gr.3 and Gr.4 cars — live at **https://francmarra.github.io/bop-radar/**

Every BoP update since version 1.15, with a verdict per car (buff / nerf / mixed) and a short
performance context: which track type it suits (high-, mid- or low-speed BoP), strengths and
weaknesses, estimated tyre wear and fuel use. Cars are **ranked by real Daily Race pace**, and a
**Daily Race guide** shows the best cars for each race, from this week's live leaderboards when available. A **balance
index** (how many cars really share the Daily Race top 100) rates each BoP update. English and Portuguese UI.

- `src/gt7bop/` — Python (stdlib only) pipeline: fetch → parse → build history → assess → JSON
- `site/` — static SPA source (vanilla JS, no build step) reading `site/data/`
- `dist/` — deploy build: `site/` + one pre-rendered page per URL (`car/<id>/`, `update/<v>/`, `week/`…), sitemap, share images
- `data/leaderboards/<board>.json` — per-car pace aggregates of finished Daily Races (no player data)
- `data/notes/<car-id>.toml` — optional hand-written notes shown on a car's page (`text = "..."`)
- `data/car_images.toml` — car id → GT7 car id, used to fetch the official car pictures at build time
- `api/` — ASP.NET Core 9 read-only REST API over `site/data` (PostgreSQL, Docker, xUnit)
- `web/` — React + TypeScript car comparator (Vite) on top of the API, see [Car comparator (React)](#car-comparator-react)

## Architecture

```mermaid
flowchart LR
  subgraph sources[External sources]
    GE[GT ENG!NE<br/>BoP pages]
    LB[gtsh-rank.com<br/>Daily Race leaderboards]
  end
  subgraph action[GitHub Action, daily]
    P[Python pipeline<br/>fetch → parse → build → assess]
    C{gt7bop check}
  end
  GE --> P
  LB --> P
  P --> D[(site/data/*.json<br/>in git)]
  D --> C
  C -- ok --> R[render: pre-rendered pages,<br/>sitemap, share images]
  C -- error --> I[action-alert issue]
  R --> GP[GitHub Pages<br/>static SPA]
  D --> IM[importer] --> PG[(PostgreSQL)] --> API[ASP.NET Core API<br/>/api/v1]
  API --> W[React comparator<br/>types from OpenAPI]
```

The Python pipeline is the single source of truth; the site is static and free to host. The .NET API and the React
comparator are an optional query layer on top of the same data and can be rebuilt from it at any time.

## Engineering decisions

Recorded as short ADRs in [`docs/adr/`](docs/adr/README.md):

- **Static site + stdlib-only pipeline** — zero hosting cost, no runtime to keep alive ([ADR 1](docs/adr/0001-static-site-stdlib-pipeline.md)).
- **Real pace over PP** — ranking validated by a backtest on unseen races, ρ +0.25 vs +0.14 ([ADR 2](docs/adr/0002-rank-by-real-pace.md)).
- **Checks gate the deploy** — broken scraped data never reaches the live site ([ADR 3](docs/adr/0003-data-checks-gate-deploy.md)).
- **API as a read-only mirror** — validated import in one transaction, Testcontainers integration tests ([ADR 4](docs/adr/0004-dotnet-api-read-only-mirror.md)).
- **Generated client** — frontend types come from the OpenAPI document; CI fails on drift ([ADR 5](docs/adr/0005-openapi-generated-client.md)).
- **No committed car images** — downloaded at build time only, with a kill switch ([ADR 6](docs/adr/0006-car-images-never-committed.md)).

Changes are summarised in [CHANGELOG.md](CHANGELOG.md).

## How I built it (AI-assisted)

I built this project with an AI coding assistant (Claude Code), and most commits are co-authored by it. The
workflow, the decisions and the review are mine:

1. **Design first** — each feature starts as a written spec in [`docs/superpowers/specs/`](docs/superpowers/specs/)
   that I review and approve (data sources, rules, what is out of scope).
2. **Plan with constraints** — the spec becomes a task-by-task plan in [`docs/superpowers/plans/`](docs/superpowers/plans/)
   with explicit constraints and a "review focus" (e.g. *an import from an empty folder must fail before touching the
   database*).
3. **Test-driven tasks** — each task lands as a small commit with its tests; a final review pass fixes what it finds
   (see the `fix: final-review …` commits).
4. **Verify against reality** — ranking rules were checked with a backtest on unseen races instead of being tuned by
   eye, and the scheduled Action refuses to deploy data that fails `gt7bop check`.

What I take from it: the assistant is fast at writing code, so the work that matters is specifying the problem,
choosing trade-offs, and checking the result — which is what the specs, tests and ADRs here record.

## Usage

```sh
uv sync
uv run gt7bop update            # fetch missing pages, rebuild site/data
uv run gt7bop update --refresh  # re-download the live pages (new game version)
uv run gt7bop update --offline  # rebuild from cache only
uv run gt7bop leaderboards --pages 26  # aggregate the last ~52 weeks of Daily Races (incremental)
uv run pytest
py -m http.server -d site 8765  # quick dev: http://127.0.0.1:8765 (SPA only)
uv run --extra render gt7bop render --out dist --site-url http://127.0.0.1:8765/  # full build: pages, sitemap, share images
uv run --extra render gt7bop render --out dist --images  # same, plus the official car pictures (see below)
py -m http.server -d dist 8765
uv run gt7bop images            # map new cars to GT7 ids -> data/car_images.toml (prints the ones still unmapped)
uv run gt7bop evaluate          # backtest the ranking on unseen Daily Races
uv run gt7bop check --baseline <old site/data> --max-age 2  # sanity checks the Action runs before committing data
```

The scheduled Action stops before committing or deploying when `check` finds broken, missing, shrinking or regressing
data (the live site keeps its last good data), and opens an `action-alert` issue on any failure or stale-data warning;
the next healthy run closes it.

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
  fetched politely, at most daily). Where the source's "Old" values disagree with its previous "New"
  values, the change shows up as *mixed*.
- Leaderboards: official Daily Race rankings via [gtsh-rank.com](https://gtsh-rank.com/daily/) — only
  car/lap-time aggregates are stored.
- Track → BoP set and car ids: [ddm999/gt7info](https://github.com/ddm999/gt7info) (MIT-0).
- Car images © Polyphony Digital Inc. / Sony Interactive Entertainment. They are **downloaded at build time only**
  (`render --images`, into the git-ignored `cache/car-images/`), converted to WebP inside `dist/` and **never
  committed** to this repository. Building without `--images` removes every picture (cars fall back to a neutral
  silhouette) — that is the kill switch if the rights holder asks: drop the flag from the workflow.
- Unofficial fan project, not affiliated with Polyphony Digital or Sony Interactive Entertainment.

## Roadmap

Tracked as [issues and milestones](https://github.com/francmarra/bop-radar/milestones):

- Deploy the API to Azure Container Apps with infrastructure as code (Bicep) and keyless CI/CD.
- "Ask the Radar": natural-language questions answered only through API tools, with automated evals.
- Angular front end for the API.
- The same API in Spring Boot, behind the same OpenAPI contract.
- Replace the tyre/fuel estimates with real per-car data exported from
  [gt7-telemetry](https://github.com/francmarra).

MIT licence.

## API (.NET)

[![api](https://github.com/francmarra/bop-radar/actions/workflows/api.yml/badge.svg)](https://github.com/francmarra/bop-radar/actions/workflows/api.yml)

Read-only REST API over the generated data (ASP.NET Core 9, EF Core, PostgreSQL, Docker, xUnit):

`Python pipeline → site/data/*.json → importer → PostgreSQL → ASP.NET Core API`

```sh
cd api && cp .env.example .env && docker compose up
```

Then open http://localhost:8080 — `/health`, interactive docs at http://localhost:8080/docs, endpoints under `/api/v1`:

```sh
curl "http://localhost:8080/api/v1/cars?group=gr3"
curl "http://localhost:8080/api/v1/cars/155-2-5-v6-ti-93/history?set=m"
curl "http://localhost:8080/api/v1/compare?ids=155-2-5-v6-ti-93,963-24"
```

Tests (need Docker, they start PostgreSQL with Testcontainers):

```sh
dotnet test api
```

## Car comparator (React)

[![web](https://github.com/francmarra/bop-radar/actions/workflows/web.yml/badge.svg)](https://github.com/francmarra/bop-radar/actions/workflows/web.yml)

Local-only React + TypeScript app (`web/`, Vite) that compares 2–4 cars side by side using the API: best-value highlights
per stat and a PP-over-BoP-versions chart. Selection lives in the URL (`?ids=…&set=m&version=…`).

![Comparing two cars](docs/img/compare.png)

```sh
cd api && cp .env.example .env && docker compose up   # API on http://localhost:8080
# in a second terminal (docker compose up keeps running in the first):
cd web && npm install && npm run dev                  # http://localhost:5173
```

API types are generated from the OpenAPI document (API running), and CI fails if the committed file drifts:

```sh
cd web && npm run gen:api
```

Tests:

```sh
cd web && npm test -- --run && npm run lint && npm run typecheck
```
