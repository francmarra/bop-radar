# Real-Pace Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rank cars per class/track type by real Daily Race pace (model fallback), prove it with a backtest, show the source in the UI.

**Architecture:** New pure module `src/gt7bop/ranking.py` consumed by `export.py`; new CLI `gt7bop evaluate`; small UI changes in `site/js`.

**Tech Stack:** Python 3.12 stdlib + pytest; vanilla JS + node:test.

**Spec:** `docs/superpowers/specs/2026-10-16-real-ranking-design.md`

## Global Constraints
- Constants mirror `rate_combos`: real score `0.7·max(0, 1 − gap/3) + 0.3·fit`, estimate `0.85·fit`; `MIN_TRACKS = 2`; tiers S ≤10 %, A ≤35 %, B ≤70 %.
- `source` ∈ `"real" | "estimate"`; UI strings EN + PT; all data escaped; a11y bar unchanged.
- Tests: `uv run pytest -q`, `node --test "tests/js/*.test.mjs"`. Commit per task on `feat/real-ranking`; no merge/push without OK.

## Review Focus
1. Car with evidence only from events before its last BoP change → still "real" (rate_combos already down-weights stale rows); the badge must not overclaim: show track count.
2. Track type with no real data for any car → whole ranking "estimate", order = model; no crash.
3. Car in index but absent from combos (new car) → estimate from fit, never missing from the ranking.
4. Ties in score → deterministic order (name).
5. Old cached car JSON without `now` (deploy cache skew) → car page falls back to history ranks.

---

### Task 1: `rank_by_pace`
**Files:** Create `src/gt7bop/ranking.py`, `tests/test_ranking.py`
**Produces:** `rank_by_pace(combos: list[dict], groups: dict) -> dict[str, dict[str, dict[str, dict]]]`; `tier_of(i: int, n: int) -> str`.
- [ ] Tests: 3 cars gr3 (`a` fit m .9 no data; `b` fit m .5 with lb gap .2 on 2 mid tracks; `c` fit m .6 with lb on 1 mid track) → mid order `b, a, c`; `b.source=="real"`, `b.tracks==2`, `c.source=="estimate"`; weighted gap uses `lb.events`; set with no data → order by fit; ties by name; car missing from all combos still ranked.
- [ ] Run → FAIL; implement; run → PASS; commit `feat(ranking): rank classes by real pace`.

### Task 2: Export wiring + car `now`
**Files:** Modify `src/gt7bop/export.py`; Test `tests/test_export.py` (new)
- [ ] Extract `build_combo_input(histories, assessments) -> dict` (same selection as today). After `rate_combos`, apply `rank_by_pace`: index car `sets[s] = {rank, tier, pp, pp_rank, source, tracks}`, `best_set` = argmin rank (tie → m), `brief` rank/tier/best_set updated, cars re-sorted by `sets.m.rank`; car files get `now`.
- [ ] Test with a minimal fake GroupHistory/assessments pair OR by calling the pure helper `apply_ranking(cars_meta, car_files, ranking)` (extract it) on dict fixtures: sets carry source/pp_rank, best_set follows rank, `now` attached.
- [ ] `uv run gt7bop update --offline` then inspect gr3 mid top 5 (expect Genesis/BRZ/NSX region). Commit `feat(export): publish real-pace ranking`.

### Task 3: `gt7bop evaluate` backtest
**Files:** Create `src/gt7bop/evaluate.py`, Modify `src/gt7bop/cli.py`; Test `tests/test_evaluate.py`
**Produces:** `spearman(xs, ys) -> float` (average ranks for ties); `evaluate(events, groups, min_cars=8) -> {"events": n, "rho_pace": float, "rho_pp": float}` where pp order = ascending `pp_rank` provided per car in `groups[g]["cars"][i]["pp_rank"][set]`.
- [ ] Tests: `spearman([1,2,3],[1,2,3])==1`, reversed `== -1`, ties handled; synthetic 2-event world where pace-ranking ρ > pp ρ.
- [ ] Implement leave-one-event-out (rate_combos without the event → rank_by_pace → order the event's matched cars). CLI prints the numbers. Run it offline on real data; record numbers in the ledger and README "How cars are assessed". Commit `feat(evaluate): leave-one-event-out backtest`.

### Task 4: UI
**Files:** Modify `site/js/pages/home.js`, `site/js/pages/car.js`, `site/js/i18n.js`, `site/style.css`; Test `tests/js/ranking.test.mjs`
- [ ] `format.js`: `sourceBadge(set, t) -> string` (`"real"` → `t("src_pace", n)`, else `t("src_est")`, escaped, class whitelisted). Test EN/PT + unknown source → estimate.
- [ ] Home row shows the badge; `rank_note`/`help_level` rewritten (EN/PT); car page header + current summary use `car.now ?? latest history`; changes table header `t("col_pp_rank")`.
- [ ] Chrome: gr3 mid order matches index.json, badge visible, car page header; Lighthouse a11y 100 on `#/`. Commit `feat(site): show real-pace ranking and its source`.

### Task 5: Final review + fixes (executing-plans final review)
