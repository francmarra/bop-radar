"""Measured fuel use and grip loss from gt7-telemetry (data/measured.json, schema 1, ADR 7).

The file is exported by `gt7 export-measurements` and committed here: CI never sees the owner's sessions."""

import json
from pathlib import Path

SCHEMA = 1
_NUMBER = (int, float)
FIELDS = {  # field -> check
    "gt7_id": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "track": lambda v: isinstance(v, str) and bool(v),
    "compound": lambda v: isinstance(v, str) and bool(v),
    "fuel_pct_per_lap": lambda v: isinstance(v, _NUMBER) and not isinstance(v, bool),
    "fuel_pct_per_km": lambda v: isinstance(v, _NUMBER) and not isinstance(v, bool),
    "grip_loss_pct_per_lap": lambda v: v is None or (isinstance(v, _NUMBER) and not isinstance(v, bool)),
    "laps": lambda v: isinstance(v, int) and not isinstance(v, bool) and v >= 1,
    "sessions": lambda v: isinstance(v, int) and not isinstance(v, bool) and v >= 1,
    "last_date": lambda v: isinstance(v, str) and len(v) == 10,
    "parser_version": lambda v: isinstance(v, int),
}


class MeasuredError(ValueError):
    pass


def load(path: Path, mapping: dict[str, int]) -> tuple[dict[str, list[dict]], list[str]]:
    """Car id -> measurements (sorted by track), plus warnings. mapping: car id -> GT7 id (car_images.toml)."""
    if not path.exists():
        return {}, []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except ValueError as e:
        raise MeasuredError(f"{path.name}: unreadable ({e.__class__.__name__})") from e
    if not isinstance(data, dict) or data.get("schema") != SCHEMA:
        raise MeasuredError(f"{path.name}: schema must be {SCHEMA}, got {data.get('schema') if isinstance(data, dict) else data!r}")
    if not isinstance(data.get("entries"), list):
        raise MeasuredError(f"{path.name}: entries must be a list")
    car_of = {gt7: car for car, gt7 in mapping.items()}
    cars: dict[str, list[dict]] = {}
    warnings: list[str] = []
    for i, e in enumerate(data["entries"]):
        for field, ok in FIELDS.items():
            if not isinstance(e, dict) or field not in e:
                raise MeasuredError(f"{path.name}: entries[{i}] has no {field}")
            if not ok(e[field]):
                raise MeasuredError(f"{path.name}: entries[{i}].{field} is invalid ({e[field]!r})")
        car = car_of.get(e["gt7_id"])
        if car is None:
            warnings.append(f"{path.name}: GT7 id {e['gt7_id']} is not in car_images.toml, skipped")
            continue
        cars.setdefault(car, []).append({
            "track": e["track"], "compound": e["compound"], "fuel_pct_per_lap": e["fuel_pct_per_lap"],
            "grip_loss_pct_per_lap": e["grip_loss_pct_per_lap"], "laps": e["laps"], "sessions": e["sessions"],
            "date": e["last_date"],
        })
    for entries in cars.values():
        entries.sort(key=lambda m: (m["track"], m["compound"]))
    return cars, warnings
