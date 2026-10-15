"""Write the static-site JSON files."""

import json
import re
import tomllib
from datetime import date
from pathlib import Path

from gt7bop.build import GroupHistory, version_key

GROUP_LABELS = {"gr1": "Gr.1", "gr2": "Gr.2", "gr3": "Gr.3", "gr4": "Gr.4"}


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "")).strip("-")


def _dump(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def export(histories: list[GroupHistory], assessments: dict[str, dict], out: Path, notes_dir: Path) -> None:
    index = {"generated": date.today().isoformat(), "groups": [], "updates": []}
    updates: dict[str, dict] = {}
    for hist in histories:
        cars_meta = []
        latest = hist.versions[-1][0]
        for name, car in hist.cars.items():
            s = slug(name)
            entries = assessments[hist.group][name]
            notes_file = notes_dir / f"{s}.toml"
            notes = tomllib.loads(notes_file.read_text(encoding="utf-8")) if notes_file.exists() else None
            _dump(out / "cars" / f"{s}.json", {
                "id": s, "name": name, "maker": car.maker, "drivetrain": car.drivetrain,
                "group": hist.group, "history": entries, "notes": notes,
            })
            last = entries[-1]
            if last["v"] == latest:  # still in the current BoP list
                cars_meta.append({
                    "id": s, "name": name, "maker": car.maker, "drivetrain": car.drivetrain,
                    "sets": {k: {"rank": v["rank"], "tier": v["tier"], "pp": v.get("pp")}
                             for k, v in last["sets"].items()},
                    "best_set": last["context"]["best_set"], "summary": last["summary"],
                    "last_change": next(({"v": e["v"], "verdict": e["verdict"]} for e in reversed(entries)
                                         if e["changed"] and e.get("verdict")), None),
                })
            for e in entries:
                if e["changed"] and e.get("verdict"):
                    u = updates.setdefault(e["v"], {"version": e["v"], "date": e["date"], "groups": {}})
                    u["groups"].setdefault(hist.group, []).append({
                        "id": s, "name": name, "verdict": e["verdict"], "delta": e.get("delta", {}),
                        "rank": e["sets"]["m"]["rank"], "summary": e["summary"],
                    })
        cars_meta.sort(key=lambda c: c["sets"]["m"]["rank"])
        index["groups"].append({"id": hist.group, "label": GROUP_LABELS[hist.group],
                                "latest": latest, "cars": cars_meta})
    for v in sorted(updates, key=version_key, reverse=True):
        u = updates[v]
        _dump(out / "updates" / f"{v}.json", u)
        index["updates"].append({"version": v, "date": u["date"],
                                 "counts": {g: _counts(lst) for g, lst in u["groups"].items()}})
    _dump(out / "index.json", index)


def _counts(entries: list[dict]) -> dict:
    c = {"buff": 0, "nerf": 0, "mixed": 0}
    for e in entries:
        c[e["verdict"]] = c.get(e["verdict"], 0) + 1
    return c
