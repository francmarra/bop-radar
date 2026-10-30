# Measured tyres and fuel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** gt7-telemetry exports measured fuel use and a grip-loss indicator per car/track/compound to `measured.json`; bop-radar validates it and shows a "Measured" line on the car page.

**Architecture:** Two repos linked by one versioned JSON file (schema 1). gt7-telemetry (pandas/duckdb) computes per-lap measures from recorded sessions and aggregates them; bop-radar (stdlib) loads the committed copy in `data/measured.json`, maps GT7 ids to its car ids, adds a `measured` list to each car's JSON, and the static site renders it.

**Tech Stack:** gt7-telemetry: Python 3.12, pandas, numpy, pytest (run with `uv run`). bop-radar: Python stdlib, pytest; site JS with `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-30-measured-tyres-fuel-design.md` (bop-radar).

## Global Constraints

- Repos: `Desktop/Projetos/gt7-telemetry` → new branch `feat/measured-export` from `feat/phase1` (no remote); `Desktop/Projetos/bop-radar` → branch `feat/measured-tyres-fuel` (already holds the spec). No push, no merge.
- bop-radar Python stays stdlib-only (ADR 0001); no new dependencies in either repo.
- `measured.json`: `"schema": 1`; entry keys exactly `gt7_id, track, compound, fuel_pct_per_lap, fuel_pct_per_km, grip_loss_pct_per_lap, laps, sessions, last_date, parser_version`; numbers rounded to 2 decimals; `grip_loss_pct_per_lap` may be `null`.
- A session is used only if `fuel_mult == 1`, `wear_mult == 1`, `loss_pct <= 1` and it has ≥ 5 clean laps. Grip loss needs ≥ 5 clean laps in the first stint, from lap 2 on.
- Copy: EN `Measured · Spa, RS, x1: fuel 2.7 %/lap · grip −0.4 %/lap (8 laps)`; PT `Medido · Spa, RS, x1: consumo 2,7 %/volta · aderência −0,4 %/volta (8 voltas)`. Grip part omitted when `null`. PT uses a decimal comma.
- Grip is called an indicator, never "tyre wear measured". The estimate level (low/medium/high) is unchanged for every car.
- UI: escaping `html` helper only, 18 px base, no new colours.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Spec adjustment (to confirm in review):** the spec says the summary sentence gains "measured on N track(s)" in `assess.py` and `i18n.js`. `assess.py` builds summaries before measurements are merged (export step), so only the site summary (`i18n.js`) gets it. Pre-rendered and OG text stay as today.

## Review Focus

1. **Real recording with the fuel multiplier at 0** (all 5 current sessions): the export must skip them with a reason, never emit `fuel_pct_per_lap: 0`. → Task 3 test `test_export_skips_old_sessions_without_multipliers` + Task 2 test `test_zero_fuel_use_is_not_a_measure`.
2. **A refuel or tyre change mid-session**: laps after the stop must not enter the grip slope, and the pit lap must not count as fuel use. → Task 2 test `test_pit_stop_ends_the_grip_stint`.
3. **Same car recorded on the same track with two compounds**: two separate entries, not one median. → Task 3 test `test_compounds_are_separate_entries`.
4. **A GT7 id not in `car_images.toml`** (new car, hand edit): warning, entry skipped, build continues. → Task 4 test `test_unknown_gt7_id_is_a_warning`.
5. **The .NET API importer reading car JSON with the new `measured` key**: must still import. → Task 5 step "run the api importer tests".

---

## Part A — gt7-telemetry

### Task 1: Record the fuel and wear multipliers

**Files:**
- Modify: `src/gt7telemetry/recorder/session.py` (`SessionMeta`), `src/gt7telemetry/recorder/writer.py` (`SessionWriter.__init__`, meta build ~l.104), `src/gt7telemetry/cli.py` (`_add_session_args`, `_track_and_compound`, both `SessionWriter(...)` calls)
- Test: `tests/test_recorder.py`, `tests/test_cli.py`

**Interfaces:**
- Produces: `SessionMeta.fuel_mult: float | None = None`, `SessionMeta.wear_mult: float | None = None` (after `bop`); `SessionWriter(..., fuel_mult: float | None = None, wear_mult: float | None = None)`; CLI flags `--fuel-mult` / `--wear-mult` (`type=float`), asked with `_ask_mult(label: str) -> float` when omitted on `record` and `live --ps5`.

- [ ] **Step 1: Write the failing tests**
  - `test_meta_roundtrip_keeps_multipliers`: write a `SessionMeta(..., fuel_mult=1.0, wear_mult=1.0)`, `read_meta` → both `1.0`.
  - `test_old_meta_without_multipliers_reads_as_none`: write a `meta.json` dict without the two keys → `read_meta(...).fuel_mult is None and .wear_mult is None`.
  - `test_record_parser_accepts_multipliers`: `build_parser().parse_args(["record", "--ps5", "1.2.3.4", "--fuel-mult", "1", "--wear-mult", "2"])` → `args.fuel_mult == 1.0`, `args.wear_mult == 2.0`.
  - `test_ask_mult_retries_until_a_number`: monkeypatch `input` to return `"x"`, then `"1"` → `_ask_mult("Fuel") == 1.0`.
- [ ] **Step 2:** `uv run pytest tests/test_recorder.py tests/test_cli.py -q` → the 4 new tests FAIL.
- [ ] **Step 3: Implement.** Dataclass defaults make old files read as `None` with no migration. `_track_and_compound` becomes `_session_inputs(args, parser, cfg) -> tuple[str, str, float, float]` (track, compound, fuel_mult, wear_mult); `_ask_mult` prompts `f"{label} multiplier? (e.g. 1) "` and repeats on a non-number or a value < 0. `--demo`/`--keyboard` live sources do not ask.
- [ ] **Step 4:** `uv run pytest -q` → all PASS; `uv run ruff check .` clean.
- [ ] **Step 5: Commit** `feat(recorder): store fuel and wear multipliers in meta.json`

### Task 2: Per-lap fuel and grip measures

**Files:**
- Create: `src/gt7telemetry/analysis/measured.py`
- Modify: `tests/helpers/synth.py` (add one helper)
- Test: `tests/test_measured.py`

**Interfaces:**
- Consumes: `add_lap_ids`, `add_distance`, `lap_table` (`analysis/laps.py`); `detect_pit_stops`, `pit_lap_ids` (`analysis/tyres.py`); `add_body_accel`, `build_envelope` (`analysis/grip.py`); `load_frames`, `read_meta`.
- Produces:
  - `MIN_CLEAN_LAPS = 5`
  - `lap_measures(frames: pd.DataFrame) -> pd.DataFrame` — one row per clean lap (`lap_table` valid and not suspect), columns `lap_id, lap, length_m, fuel_pct, fuel_pct_per_km, grip_radius_g, stint` (stint = 1 before the first pit stop, 2 after, …).
  - `grip_loss_pct_per_lap(measures: pd.DataFrame) -> float | None` — stint 1, laps with `lap >= 2`; `None` if fewer than `MIN_CLEAN_LAPS`.
  - `@dataclass(frozen=True) class SessionMeasures: car_id: int; track: str; compound: str; date: str; laps: int; fuel_pct_per_lap: float; fuel_pct_per_km: float; grip_loss_pct_per_lap: float | None; parser_version: int`
  - `measure_session(session_dir: Path) -> SessionMeasures | str` — the string is the skip reason.
- Test helper (synth.py): `session_with(speeds_ms: list[float], fuel_pct_per_lap: float) -> pd.DataFrame` — like `session()` but one `stadium_lap` per speed, and `fuel` falling linearly with distance by `fuel_pct_per_lap` of `fuel_capacity` per lap, starting at 100.

- [ ] **Step 1: Write the failing tests** (`tests/test_measured.py`)
  - `test_fuel_per_lap_and_per_km`: `session_with([40.0] * 8, 2.5)` → every `fuel_pct` ≈ 2.5 (abs 0.05); `fuel_pct_per_km` ≈ `2.5 / (track_length() / 1000)` (rel 2 %).
  - `test_grip_loss_matches_falling_cornering_speed`: speeds `[40, 40, 39.6, 39.2, 38.8, 38.4, 38.0, 37.6]` → lateral g ∝ v², so the expected loss is the slope of `(v/v_lap2)²·100` over laps 2..8, negated; assert `grip_loss_pct_per_lap` within 10 % of it and > 0.
  - `test_constant_speed_has_no_grip_loss`: `[40.0] * 8` → `abs(loss) < 0.05`.
  - `test_too_few_laps_gives_no_grip_value`: 5 laps total (4 from lap 2) → `None`.
  - `test_pit_stop_ends_the_grip_stint`: 8 laps with a refuel (+20 % in 1 s) during lap 5 → lap 5 not in the measures; only stint-1 laps feed the slope (here < 5 from lap 2 → `None`); fuel rows after the stop are still clean laps.
  - `test_zero_fuel_use_is_not_a_measure`: write the session (`write_session`) with meta `fuel_mult=1, wear_mult=1` and `fuel_pct_per_lap=0` → `measure_session` returns a string containing `"no fuel use"`.
  - `test_measure_session_skips_wrong_multipliers`: meta `fuel_mult=None` → reason contains `"multiplier"`; `wear_mult=2` → same.
  - `test_measure_session_needs_five_clean_laps`: 4 laps → reason contains `"clean laps"`.
  `write_session` gains `fuel_mult: float | None = None, wear_mult: float | None = None` parameters passed into `SessionMeta`.
- [ ] **Step 2:** `uv run pytest tests/test_measured.py -q` → FAIL (module missing).
- [ ] **Step 3: Implement** in `analysis/measured.py`:
  - Fuel per lap = (first − last `fuel` of the lap) / `fuel_capacity` × 100; per km = that / (`length_m` / 1000).
  - `grip_radius_g` = `float(np.nanmean(build_envelope(a_long_g, a_lat_g, sessions=1).radii_g))` on that lap's frames from `add_body_accel`, filtered like `envelope_points` (on track, speed > `MIN_SPEED_MS`).
  - Grip loss: least-squares slope (`np.polyfit(lap, radius, 1)[0]`) over stint 1, `lap >= 2`, as `-slope / radius_of_first_used_lap * 100`, rounded to 2.
  - `measure_session` checks in this order and returns the first failing reason: multipliers not both `1` → `"fuel/wear multiplier not x1"`; `meta.loss_pct > 1` → `"packet loss above 1 %"`; fewer than `MIN_CLEAN_LAPS` clean laps → `"fewer than 5 clean laps"`; median `fuel_pct` ≤ 0.01 → `"no fuel use measured"`. `date` = `meta.started_at[:10]`.
- [ ] **Step 4:** `uv run pytest -q` → all PASS; `uv run ruff check .` clean.
- [ ] **Step 5: Commit** `feat(analysis): per-lap fuel use and grip-loss indicator`

### Task 3: `gt7 export-measurements`

**Files:**
- Create: `src/gt7telemetry/analysis/export.py`
- Modify: `src/gt7telemetry/cli.py` (sub-parser + dispatch), `README.md` (short section + pointer to bop-radar's `docs/telemetry-protocol.md`)
- Test: `tests/test_export.py`

**Interfaces:**
- Consumes: `measure_session`, `SessionMeasures` (Task 2); `list_sessions(*roots)`.
- Produces: `build_measurements(roots: Sequence[Path], today: date) -> tuple[dict, list[tuple[Path, str]]]` — the `measured.json` dict and the skipped `(session, reason)` list. CLI: `gt7 export-measurements [--sessions-dir sessions] --out PATH` writes the JSON (UTF-8, indent 2), prints skipped sessions to stderr, prints `N entries from M sessions` to stdout, exit 0 (exit 1 only if `--out`'s folder does not exist).

- [ ] **Step 1: Write the failing tests**
  - `test_export_shape`: one valid session → dict has `schema == 1`, `generated == today.isoformat()`, `source == "gt7-telemetry"`, one entry with exactly the 10 keys in Global Constraints, `sessions == 1`.
  - `test_two_sessions_take_the_median`: same car/track/compound, fuel 2.0 and 3.0 %/lap → one entry, `fuel_pct_per_lap == 2.5`, `sessions == 2`, `laps` = sum, `last_date` = the newer date.
  - `test_compounds_are_separate_entries`: same car/track, RS and RM → two entries.
  - `test_export_skips_old_sessions_without_multipliers`: a session written without multipliers → no entries, skipped list has it with `"multiplier"`.
  - `test_grip_median_ignores_missing_values`: one session with grip `None`, one with 0.4 → `0.4`; both `None` → `None`.
  - `test_cli_writes_file`: `main(["export-measurements", "--sessions-dir", str(root), "--out", str(out)])` → returns 0 and `json.loads(out.read_text())["schema"] == 1`.
- [ ] **Step 2:** `uv run pytest tests/test_export.py -q` → FAIL.
- [ ] **Step 3: Implement** grouping by `(car_id, track, compound)` with `statistics.median`; entries sorted by `(gt7_id, track, compound)` so the file diffs cleanly.
- [ ] **Step 4:** `uv run pytest -q` all PASS; ruff clean. Manual: `uv run gt7 export-measurements --out ../bop-radar/data/measured.tmp.json` on the real `sessions/` → 0 entries, the 5 sessions listed as skipped (multiplier). Delete the tmp file.
- [ ] **Step 5: Commit** `feat(cli): export-measurements writes measured.json (schema 1)`

## Part B — bop-radar

### Task 4: Load and validate `measured.json`

**Files:**
- Create: `src/gt7bop/measured.py`, `data/measured.json`
- Modify: `src/gt7bop/check.py` (`check(...)` gains `measured: Path | None = None`), `src/gt7bop/cli.py:53` (pass `ROOT / "data" / "measured.json"`)
- Test: `tests/test_measured.py`, `tests/test_check.py`

**Interfaces:**
- Consumes: `carimages.read_mapping(path) -> dict[str, int]` (car id → GT7 id).
- Produces:
  - `class MeasuredError(ValueError)`
  - `load(path: Path, mapping: dict[str, int]) -> tuple[dict[str, list[dict]], list[str]]` — car id → list of `{"track", "compound", "fuel_pct_per_lap", "grip_loss_pct_per_lap", "laps", "sessions", "date"}` (date ← `last_date`), sorted by track; plus warnings. Missing file → `({}, [])`.
  - `data/measured.json` content: `{"schema": 1, "generated": "2026-10-30", "source": "gt7-telemetry", "entries": []}`.

- [ ] **Step 1: Write the failing tests**
  - `test_missing_file_is_empty`; `test_empty_entries_is_empty`.
  - `test_valid_entry_maps_to_car_id`: mapping `{"mercedes-amg-gt3-20": 3531}`, entry `gt7_id 3531` → key `"mercedes-amg-gt3-20"` with the 7 fields above.
  - `test_wrong_schema_raises`: `schema: 2` → `MeasuredError` whose message contains `"measured.json"` and `"schema"`.
  - `test_missing_field_raises_with_index`: entry 0 without `laps` → message contains `"entries[0]"` and `"laps"`.
  - `test_unknown_gt7_id_is_a_warning`: `gt7_id 1` → `({}, [warning containing "1"])`.
  - `test_check_reports_broken_measured_file` (test_check.py): `check(data, measured=bad_path)` → an error starting with `"measured.json:"`.
- [ ] **Step 2:** `uv run pytest tests/test_measured.py tests/test_check.py -q` → FAIL.
- [ ] **Step 3: Implement** with `json` + type checks (numbers for the numeric fields, `grip_loss_pct_per_lap` number or `None`, `laps`/`sessions` int ≥ 1); invert the mapping once; `check` turns `MeasuredError` into an error and warnings into warnings.
- [ ] **Step 4:** `uv run pytest -q` → all PASS; `uv run ruff check .` clean.
- [ ] **Step 5: Commit** `feat(data): load and check measured.json from gt7-telemetry`

### Task 5: Merge measurements into car JSON

**Files:**
- Modify: `src/gt7bop/export.py` (`export(...)` gains `measured: dict[str, list[dict]] | None = None`; set `car_files[s]["measured"]` only when `s` has entries), `src/gt7bop/cli.py:95` (load with `measured.load(ROOT / "data" / "measured.json", read_mapping(ROOT / "data" / "car_images.toml"))`, print warnings to stderr)
- Test: `tests/test_export.py`

**Interfaces:**
- Consumes: `measured.load` (Task 4).
- Produces: car file `site/data/cars/<id>.json` has `"measured": [...]` (Task 4 shape) for measured cars and **no key** otherwise.

- [ ] **Step 1: Write the failing tests**
  - `test_export_adds_measured_for_that_car_only`: run the existing export fixture with `measured={<one fixture car id>: [entry]}` → that car's file has `measured == [entry]`; another car's file has no `"measured"` key.
  - `test_export_without_measured_is_unchanged`: export with `measured=None` and with `{}` → every car file is byte-identical between the two runs.
- [ ] **Step 2:** `uv run pytest tests/test_export.py -q` → FAIL.
- [ ] **Step 3: Implement** (one `if` in the car loop; no change to `assess.py`).
- [ ] **Step 4:** `uv run pytest -q` PASS. Then run the api importer tests: `cd api && dotnet test --filter Category!=Integration` (or the project's unit filter) → PASS; if the importer rejects the unknown key, add `"measured"` to its ignore list in the same task.
- [ ] **Step 5: Commit** `feat(export): add measured fuel and grip to car files`

### Task 6: Show the "Measured" line

**Files:**
- Modify: `site/js/pages/car.js` (export `measuredLines(list, t, lang)`, use it in `#tyres-body` under the fuel level, pass the count into the summary brief), `site/js/i18n.js` (EN+PT keys and the summary sentence; update `help_estimates`)
- Test: `tests/js/car.test.mjs`, `tests/js/i18n.test.mjs`

**Interfaces:**
- Consumes: car payload `measured` (Task 5); `html`, `num` (`format.js`), `info` (`format.js`).
- Produces: `measuredLines(list: Array|undefined, t, lang: "en"|"pt") -> Html|""`; i18n keys `measured` ("Measured"/"Medido"), `m_fuel` ("fuel"/"consumo"), `m_grip` ("grip"/"aderência"), `per_lap` ("%/lap"/"%/volta"), `laps_n(n)` ("8 laps"/"8 voltas"), `measured_info` (ⓘ text, below); brief field `measured: number` (count of entries) read by both `summary(b)` functions.

- [ ] **Step 1: Write the failing tests**
  - `measuredLines` with `[{track:"spa", compound:"RS", fuel_pct_per_lap:2.7, grip_loss_pct_per_lap:0.4, laps:8, sessions:1, date:"2026-11-02"}]`:
    - EN string contains `Measured · Spa, RS, x1: fuel 2.7 %/lap · grip −0.4 %/lap (8 laps)` (track name via the existing track-name lookup; fall back to the raw id capitalised).
    - PT contains `Medido · Spa, RS, x1: consumo 2,7 %/volta · aderência −0,4 %/volta (8 voltas)`.
  - grip `null` → no `aderência`/`grip` text, fuel part still there.
  - `undefined` and `[]` → `""`.
  - a track value `"<b>x</b>"` is escaped (`&lt;b&gt;`).
  - i18n: `summary({...baseBrief, measured: 2})` EN contains `Measured on 2 tracks.`, PT `Medido em 2 pistas.`; `measured: 1` → `1 track` / `1 pista`; `measured` absent → sentence unchanged (compare with the current output).
- [ ] **Step 2:** `node --test "tests/js/*.test.mjs"` → the new tests FAIL.
- [ ] **Step 3: Implement.** `measured_info` EN: "Fuel use is measured from the owner's own laps (fuel and wear x1). Grip is an indicator: how much the cornering grip fell per lap. GT7 does not report tyre wear." PT: "O consumo é medido nas voltas do autor (combustível e desgaste x1). A aderência é um indicador: quanto caiu a aderência em curva por volta. O GT7 não indica o desgaste dos pneus." `help_estimates` drops "They are not measured yet." / "Ainda não são medidos." and adds "Some cars also show measured values." / "Alguns carros mostram também valores medidos." PT numbers: `num(v, 1).replace(".", ",")`.
- [ ] **Step 4:** `node --test "tests/js/*.test.mjs"` PASS; `uv run pytest -q` PASS (render tests still green).
- [ ] **Step 5: Commit** `feat(car): show measured fuel and grip next to the estimate`

### Task 7: Protocol, ADR, changelog

**Files:**
- Create: `docs/telemetry-protocol.md`, `docs/adr/0007-measured-data-file-contract.md`
- Modify: `docs/adr/README.md` (line 7), `CHANGELOG.md` (new top section `## 2026-10-30 — Measured tyres and fuel (gt7-telemetry)`), vault note `Projetos/bop-radar.md` (Estado + Histórico)

- [ ] **Step 1:** Protocol: custom lobby, fuel x1 and wear x1, note the compound, 8–10 laps in a row without pitting, one session per car and track, `gt7 record --ps5 <ip> --track <t> --tyres <c> --fuel-mult 1 --wear-mult 1`, then `uv run gt7 export-measurements --out ../bop-radar/data/measured.json`, run `uv run gt7bop check`, commit the file.
- [ ] **Step 2:** ADR 0007 in the existing ADR format (Context / Decision / Consequences): file contract v1, committed copy, why not reading parquet (stdlib, CI has no sessions), schema bump rule (any field rename or meaning change → `schema: 2`, loader rejects unknown schemas).
- [ ] **Step 3:** `uv run gt7bop check` → no errors; `node --test "tests/js/*.test.mjs"` and `uv run pytest -q` PASS.
- [ ] **Step 4: Commit** `docs: telemetry protocol, ADR 7 measured.json contract, changelog`
