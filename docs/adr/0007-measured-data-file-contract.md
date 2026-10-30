# 7. Measured tyres and fuel come from gt7-telemetry as a committed, versioned file

Date: 2026-10-30 · Status: accepted

## Context
Tyre wear and fuel use on the site are estimates from weight, torque, drivetrain and power. The owner's sister
project gt7-telemetry records real laps from the PS5 (pandas/duckdb, sessions stored locally). GT7's telemetry sends
fuel level but no tyre wear, and no fuel or wear multiplier.

## Decision
`gt7 export-measurements` writes `measured.json`, which is committed here as `data/measured.json`. Contract, schema 1:
`{"schema": 1, "generated", "source": "gt7-telemetry", "entries": [...]}`, one entry per GT7 car id, track and compound
with `fuel_pct_per_lap`, `fuel_pct_per_km`, `grip_loss_pct_per_lap` (or `null`), `laps`, `sessions`, `last_date` and
`parser_version`. Only sessions recorded with fuel and wear at x1 are exported. `gt7bop` maps GT7 ids with
`car_images.toml`, adds a `measured` list to each measured car's JSON and shows it beside the estimate, which stays
unchanged. Grip loss is labelled an indicator (fall of the g-g envelope per lap), never "tyre wear".

## Consequences
- bop-radar keeps its stdlib-only pipeline (ADR 1) and CI needs no access to the owner's sessions.
- `gt7bop check` rejects a broken file, so a bad export cannot deploy (ADR 3). Unknown GT7 ids are warnings.
- Any renamed field or changed meaning bumps the schema to 2; the loader rejects schemas it does not know.
- Coverage is limited to the cars the owner records; the rest keep the estimate.
