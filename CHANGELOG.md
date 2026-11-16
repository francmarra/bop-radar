# Changelog

Notable changes, newest first. Daily `data: BoP update` commits are not listed.

## 2026-11-16 — Track pages, BoP feed, dark look
- Track pages in the menu and for search engines: `tracks/` plus one pre-rendered page per track and class with real Daily Race data; the weekly guide links each race to its track.
- RSS feed of the latest 20 BoP updates (`updates.xml`), advertised in every page's `<head>` and linked from the BoP page.
- Dark "pit wall" look by default (light theme in settings), bigger car pictures, fewer decorations.
- Daily Race classes come from gtstats when gtsh-rank leaves them out.

## 2026-10-30 — Measured tyres and fuel (gt7-telemetry)
- Car pages show measured fuel use and a grip-loss indicator next to the estimate, from the owner's own laps (ADR 7).
- `data/measured.json` (schema 1) is exported by gt7-telemetry and validated by `gt7bop check`; empty for now.
- Recording protocol in `docs/telemetry-protocol.md`.

## 2026-10-22 — Car comparator (React + TypeScript)
- `web/`: compare 2–4 cars side by side (best value per stat, PP-over-BoP-versions chart), state in the URL.
- Typed client generated from the API's OpenAPI document; CI fails on type drift (ADR 5).
- Vitest + React Testing Library + MSW tests, ESLint, typecheck; `web.yml` workflow.

## 2026-10-21 — REST API (.NET)
- `api/`: ASP.NET Core 9 Minimal API over PostgreSQL (EF Core): cars, history, updates, tracks, compare (ADR 4).
- Idempotent one-transaction import; xUnit unit + Testcontainers integration tests; Docker + compose; `api.yml`.

## 2026-10-18 – 2026-10-20 — Redesign and reliability
- Chrome/silver visual style, landing page with the class leader, mobile fixes down to 320 px.
- Official car images at build time only (ADR 6); BoP balance index (effective cars in the Daily Race top 100).
- Data sanity checks before every deploy, with an `action-alert` issue on failure (ADR 3).
- Live Daily Race guide from this week's leaderboards; HTML templates escape by default.

## 2026-10-16 — First release
- Scraper, per-car BoP history and assessment, static site on GitHub Pages (ADR 1).
- Real-pace ranking from Daily Race leaderboards with a backtest (ADR 2); per-track ratings.
- EN/PT UI, accessibility pass (AA contrast, skip link, popovers), SEO pre-rendered pages and sitemap.
