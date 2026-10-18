"""Sanity checks on site/data before it is committed and deployed.

The scrapers run unattended twice a week; a layout change upstream can produce data that is valid JSON but wrong.
Errors (broken, missing, shrinking or regressing data) stop the job so the live site keeps its last good data.
Warnings (stale data: a scraper fell back to its previous file) still deploy, but raise an alert."""

import json
from datetime import date
from pathlib import Path

GROUPS = ("gr1", "gr2", "gr3", "gr4")
MIN_KEPT = 0.8  # a group losing more than 20 % of its cars in one run is a scraping problem, not a BoP update


def _load(path: Path, errors: list[str]):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        errors.append(f"{path.name}: unreadable ({e.__class__.__name__})")
        return None


def _version(v: str) -> tuple[int, ...]:
    return tuple(int(p) for p in v.split(".") if p.isdigit())


def _summary(index: dict, tracks: list) -> dict:
    return {"cars": {g["id"]: len(g["cars"]) for g in index["groups"]}, "tracks": len(tracks), "events": index.get("events", 0),
            "updates": len(index["updates"]), "latest": max((u["version"] for u in index["updates"]), key=_version, default="0")}


def check(data: Path, baseline: Path | None = None, max_age_days: int | None = None, today: date | None = None
          ) -> tuple[list[str], list[str]]:
    """Return (errors, warnings). baseline: the previous site/data; max_age_days: only when this run refreshed the data."""
    errors: list[str] = []
    warnings: list[str] = []
    index, tracks, week = (_load(data / f, errors) for f in ("index.json", "tracks.json", "week.json"))
    if index is None:
        return errors, warnings

    groups = {g["id"]: g["cars"] for g in index["groups"]}
    for g in GROUPS:
        if not groups.get(g):
            errors.append(f"index.json: group {g} has no cars")
    missing = [c["id"] for cars in groups.values() for c in cars if not (data / "cars" / f"{c['id']}.json").exists()]
    missing += [f"update {u['version']}" for u in index["updates"] if not (data / "updates" / f"{u['version']}.json").exists()]
    if missing:
        errors.append(f"missing detail files: {', '.join(missing[:10])}" + (f" (+{len(missing) - 10})" if len(missing) > 10 else ""))
    if not index["updates"]:
        errors.append("index.json: no BoP updates")
    if tracks is not None and (not isinstance(tracks, list) or not tracks):
        errors.append("tracks.json: no tracks")
    if week is not None and (not isinstance(week.get("weeks"), list)
                             or any("track" not in r for w in week["weeks"] for r in w.get("races", []))):
        errors.append("week.json: unexpected structure")
    if errors:
        return errors, warnings

    now = _summary(index, tracks)
    if baseline is not None and (baseline / "index.json").exists():
        prev_errors: list[str] = []
        prev_index, prev_tracks = _load(baseline / "index.json", prev_errors), _load(baseline / "tracks.json", prev_errors)
        if not prev_errors:
            prev = _summary(prev_index, prev_tracks)
            for g, n in prev["cars"].items():
                if now["cars"].get(g, 0) < n * MIN_KEPT:
                    errors.append(f"{g}: {now['cars'].get(g, 0)} cars, was {n}")
            if _version(now["latest"]) < _version(prev["latest"]):
                errors.append(f"latest BoP update went back from {prev['latest']} to {now['latest']}")
            for key in ("updates", "tracks", "events"):
                if now[key] < prev[key]:
                    errors.append(f"{key}: {now[key]}, was {prev[key]}")

    if max_age_days is not None:
        today = today or date.today()
        for name, doc in (("index.json", index), ("week.json", week)):
            age = (today - date.fromisoformat(doc["generated"])).days
            if age > max_age_days:
                warnings.append(f"{name}: generated {doc['generated']} ({age} days ago), the refresh kept old data")
    return errors, warnings
