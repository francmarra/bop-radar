# 2. Rank cars by real Daily Race pace, validated by a backtest

Date: 2026-10-16 · Status: accepted

## Context
The usual proxy for "best car under this BoP" is the PP number. Players care about lap times in real races.

## Decision
Rank cars per class and BoP track type by real pace from Daily Race leaderboards (≥ 2 layouts with ≥ 10 laps under
the current BoP), falling back to the model estimate. The rules were fixed up front and then checked with
`gt7bop evaluate`, which predicts each past race using only earlier data.

## Consequences
- Backtest over 40 events: mean Spearman ρ **+0.25** for real pace vs **+0.14** for PP; better in 65 % of events.
- 17 alternative rule sets were tried afterwards; none scored higher, so the original rules stayed (no tuning to
  the test set).
- 40 events is a small, noisy sample — the README states it next to the result.
