# Measured tyres and fuel from gt7-telemetry — design

Date: 2026-10-30 · Status: approved in chat, spec under review · Branch: `feat/measured-tyres-fuel`

## Goal

Where the owner has recorded a car with gt7-telemetry (the owner's sister project, local for now), the car page shows
**measured** fuel use and a **grip-loss indicator** next to the current estimate. Cars without
recordings stay exactly as they are. The link between the two projects is a small, versioned data
file, so each repo stays independent and testable on its own.

## Facts that shape the design

- The 5 sessions recorded so far (Spa, RS, 2026-10-27, GT7 ids 3531 / 3508 / 3474) use **0.00 fuel per
  lap**: the fuel multiplier was 0. There is no real fuel data yet.
- GT7's UDP telemetry **does not send tyre wear**. Only temperatures, wheel speed and slip. Tyres can
  only be described indirectly, by how grip falls during a stint.
- GT7 does not send the fuel or wear multiplier either. They must be typed in at recording time.
- bop-radar already maps GT7 ids to its car ids in `data/car_images.toml`.
- Coverage will always be small (a few cars out of ~120). Measured values are shown beside the
  estimate, never mixed into the same percentile scale.

## Success criteria

1. `gt7 export-measurements` turns valid sessions into `measured.json` (schema 1); tests on
   synthetic sessions with known fuel use and grip loss pass.
2. bop-radar validates and merges the file; `gt7bop check` fails on a broken file.
3. A car with measurements shows a "Measured" line (EN/PT) on its page; every other car renders
   byte-for-byte as before (test with an empty `measured.json`).
4. A recording protocol is written, so new sessions are useful the first time.

## Part 1 — gt7-telemetry

### Recording metadata

`meta.json` gains `fuel_mult` and `wear_mult` (numbers), asked at recording time the same way the
compound is (`_ask_compound` in `cli.py`). Old sessions have no such keys and are treated as `null`
→ skipped by the export.

### Per-lap measures

- **Clean lap:** a complete lap (`lap` increments, `last_lap_ms` > 0), not the out-lap, not a lap
  with a pit stop (`pit_lap_ids` in `analysis/tyres.py`), not within `RESTART_IGNORE_S` of a restart.
- **Fuel:** `fuel` at lap start minus `fuel` at lap end, as a percentage of `fuel_capacity`.
  Per km = that value divided by the lap length from `add_distance`.
- **Grip:** the mean radius of the lap's g-g envelope (`grip.py`, `ENVELOPE_SECTORS` /
  `ENVELOPE_QUANTILE`). Grip loss per lap = the slope of a least-squares line through the envelope
  radius of the stint's clean laps from lap 2 onwards, as a % of the first value. Fewer than 5 clean
  laps in the stint → no grip value (fuel is still reported).

### Session filter

A session is used only if `fuel_mult == 1` and `wear_mult == 1`, `loss_pct` ≤ 1 and it has ≥ 5
clean laps. Skipped sessions are listed on stderr with the reason.

### Export

`gt7 export-measurements --out <path>` aggregates the used sessions per (GT7 car id, track,
compound) with medians:

```json
{
  "schema": 1,
  "generated": "2026-11-02",
  "source": "gt7-telemetry",
  "entries": [
    {
      "gt7_id": 3531, "track": "spa", "compound": "RS",
      "fuel_pct_per_lap": 2.7, "fuel_pct_per_km": 0.39,
      "grip_loss_pct_per_lap": 0.4,
      "laps": 8, "sessions": 1, "last_date": "2026-11-02",
      "parser_version": 2
    }
  ]
}
```

`grip_loss_pct_per_lap` may be `null`. Numbers are rounded to 2 decimals.

### Tests

Synthetic sessions built in the test (no real recordings in the repo): known fuel drop per lap,
known envelope shrink; edge cases: pit stop mid-stint, `fuel_mult` null, < 5 laps, restart.

## Part 2 — bop-radar

### `src/gt7bop/measured.py` (stdlib only)

- `load(path) -> list[Entry]`: reads `data/measured.json`; a missing file means no entries. A wrong
  `schema` or a missing field raises with the file name and the entry index.
- GT7 id → car id via the inverted `data/car_images.toml` map. An unknown id is a warning and the
  entry is skipped.
- `gt7bop check` runs the same validation, so a broken file stops the deploy (ADR 0003).

### Merge

`_wear_fuel_scores` in `assess.py` is unchanged: the low/medium/high level stays an estimate for
every car. Cars with entries get, in the exported car JSON:

```json
"measured": [{"track": "spa", "compound": "RS", "fuel_pct_per_lap": 2.7,
              "grip_loss_pct_per_lap": 0.4, "laps": 8, "sessions": 1, "date": "2026-11-02"}]
```

Cars without entries get no `measured` key. The summary sentence (`assess.py` and `i18n.js`) adds
"measured on N track(s)" when the key exists.

### UI (`site/js/pages/car.js`, `site/js/i18n.js`)

Inside the existing tyres/fuel card, one line per entry under the estimated level:

- EN: `Measured · Spa, RS, x1: fuel 2.7 %/lap · grip −0.4 %/lap (8 laps)`
- PT: `Medido · Spa, RS, x1: consumo 2,7 %/volta · aderência −0,4 %/volta (8 voltas)`

Grip is omitted when `null`. The ⓘ text explains that fuel is measured and grip is an indicator,
not the game's tyre wear. Built with the escaping `html` helper; 18 px, AA contrast, no new colours.

### Docs

- `docs/telemetry-protocol.md`: custom lobby, fuel x1 and wear x1, compound noted, 8–10 laps in a
  row without pitting, one session per car and track, then `gt7 export-measurements --out
  ../bop-radar/data/measured.json`, commit the file. A short pointer to it goes in the
  gt7-telemetry README.
- `docs/adr/0007-measured-data-file-contract.md`: the `measured.json` v1 contract, and why a
  committed file instead of reading the parquet sessions (no pandas/duckdb in bop-radar, CI cannot
  see local sessions).
- CHANGELOG entry.

### Tests

- pytest: valid file, wrong schema, missing field, unknown GT7 id, merge onto a car, empty file
  → no `measured` keys.
- JS (existing runner): the card with one entry, with `grip_loss_pct_per_lap: null`, and without
  `measured`.

## Out of scope

Multipliers other than x1; using measurements in the ranking or the weekly guide; a per-track
table; filling cars without recordings; any change to the estimate formula.

## Order of work

gt7-telemetry first (metadata, measures, export, tests), then bop-radar (loader, merge, UI, docs).
Until real sessions with fuel on exist, bop-radar ships with an empty `data/measured.json`, so the
live site does not change.
