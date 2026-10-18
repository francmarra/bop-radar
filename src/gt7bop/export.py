"""Write the static-site JSON files."""

import json
import re
import shutil
import tomllib
from datetime import date
from pathlib import Path

from gt7bop.build import GroupHistory, version_key
from gt7bop.leaderboards import effective_cars
from gt7bop.ranking import rank_by_pace
from gt7bop.tracks import rate_combos, version_at

GROUP_LABELS = {"gr1": "Gr.1", "gr2": "Gr.2", "gr3": "Gr.3", "gr4": "Gr.4"}


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "")).strip("-")


def _dump(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def _brief(e: dict) -> dict:
    """What the site needs to write the summary sentence in any language."""
    c = e["context"]
    return {"verdict": e.get("verdict"), "changed": e["changed"], "delta": e.get("delta", {}), "of": e["of"],
            "rank": e["sets"][c["best_set"]]["rank"], "tier": e["sets"][c["best_set"]]["tier"],
            "best_set": c["best_set"], "all_rounder": c["all_rounder"], "strengths": c["strengths"],
            "tyre_wear": c["tyre_wear"], "fuel_use": c["fuel_use"]}


def build_combo_input(histories: list[GroupHistory], assessments: dict[str, dict]) -> dict:
    """rate_combos/rank_by_pace input: the cars still in each group's current BoP list."""
    combo_input: dict[str, dict] = {}
    for hist in histories:
        latest = hist.versions[-1][0]
        cars = []
        for name, car in hist.cars.items():
            last = assessments[hist.group][name][-1]
            if last["v"] == latest:
                cars.append({"id": slug(name), "name": name, "maker": car.maker, "fit": last["context"]["fit"],
                             "changed_versions": sorted(car.changed, key=version_key),
                             "pp_rank": {k: v["rank"] for k, v in last["sets"].items()}})
        combo_input[hist.group] = {"versions": hist.versions, "cars": cars}
    return combo_input


def apply_ranking(groups: list[dict], car_files: dict[str, dict], ranking: dict) -> None:
    """Swap the PP-based class ranks for the real-pace ranking (keeping PP and its rank for reference)."""
    for g in groups:
        by_car = ranking.get(g["id"], {})
        for c in g["cars"]:
            now = by_car.get(c["id"])
            if not now:
                continue
            c["sets"] = {s: {**now[s], "pp": c["sets"][s].get("pp"), "pp_rank": c["sets"][s]["rank"]} for s in now}
            best = min(now, key=lambda s: (now[s]["rank"], s != "m"))
            c["best_set"] = best
            c["brief"] = {**c["brief"], "rank": now[best]["rank"], "tier": now[best]["tier"], "best_set": best}
            car_files[c["id"]]["now"] = c["sets"]
        g["cars"].sort(key=lambda c: c["sets"]["m"]["rank"])


def export(histories: list[GroupHistory], assessments: dict[str, dict], out: Path, notes_dir: Path,
           events: list[dict] | None = None) -> None:
    for sub in ("cars", "updates"):  # generated output: drop files of cars/versions that no longer exist
        shutil.rmtree(out / sub, ignore_errors=True)
    index = {"generated": date.today().isoformat(), "groups": [], "updates": [], "events": len(events or [])}
    updates: dict[str, dict] = {}
    car_files: dict[str, dict] = {}
    combo_input = build_combo_input(histories, assessments)
    for hist in histories:
        cars_meta = []
        latest = hist.versions[-1][0]
        for name, car in hist.cars.items():
            s = slug(name)
            entries = assessments[hist.group][name]
            notes_file = notes_dir / f"{s}.toml"
            notes = tomllib.loads(notes_file.read_text(encoding="utf-8")) if notes_file.exists() else None
            car_files[s] = {
                "id": s, "name": name, "maker": car.maker, "drivetrain": car.drivetrain,
                "group": hist.group, "history": entries, "notes": notes, "tracks": [],
            }
            last = entries[-1]
            if last["v"] == latest:  # still in the current BoP list
                cars_meta.append({
                    "id": s, "name": name, "maker": car.maker, "drivetrain": car.drivetrain,
                    "sets": {k: {"rank": v["rank"], "tier": v["tier"], "pp": v.get("pp")}
                             for k, v in last["sets"].items()},
                    "best_set": last["context"]["best_set"], "summary": last["summary"], "brief": _brief(last),
                    "last_change": next(({"v": e["v"], "verdict": e["verdict"]} for e in reversed(entries)
                                         if e["changed"] and e.get("verdict")), None),
                })
            for e in entries:
                if e["changed"] and e.get("verdict"):
                    u = updates.setdefault(e["v"], {"version": e["v"], "date": e["date"], "groups": {}})
                    u["groups"].setdefault(hist.group, []).append({
                        "id": s, "name": name, "verdict": e["verdict"], "delta": e.get("delta", {}),
                        "rank": e["sets"]["m"]["rank"], "summary": e["summary"], "brief": _brief(e),
                    })
        cars_meta.sort(key=lambda c: c["sets"]["m"]["rank"])
        index["groups"].append({"id": hist.group, "label": GROUP_LABELS[hist.group],
                                "latest": latest, "cars": cars_meta})
    combos = rate_combos(events or [], combo_input)
    _dump(out / "tracks.json", combos)
    apply_ranking(index["groups"], car_files, rank_by_pace(combos, combo_input))
    for t in combos:
        for g in t["groups"].values():
            for rank, c in enumerate(g["cars"], 1):
                if c["lb"]:
                    car_files[c["id"]]["tracks"].append({"id": t["id"], "name": t["name"], "set": t["set"],
                                                         "rank": rank, "of": len(g["cars"]), "tier": c["tier"],
                                                         **c["lb"]})
    for s, payload in car_files.items():
        payload["tracks"].sort(key=lambda r: (r["rank"] / r["of"], r["name"]))
        _dump(out / "cars" / f"{s}.json", payload)
    balance = _balance(events or [], updates)
    for v in sorted(updates, key=version_key, reverse=True):
        u = updates[v]
        u["balance"] = balance.get(v, {})
        _dump(out / "updates" / f"{v}.json", u)
        index["updates"].append({"version": v, "date": u["date"], "balance": u["balance"],
                                 "counts": {g: _counts(lst) for g, lst in u["groups"].items()}})
    _dump(out / "index.json", index)


def _balance(events: list[dict], updates: dict[str, dict]) -> dict[str, dict]:
    """version -> group -> mean effective cars in the top 100 of the Daily Races run under that class's BoP,
    from that change until the class's next one."""
    per: dict[tuple[str, str], list[float]] = {}
    for e in events:
        changes = [(v, u["date"]) for v, u in updates.items() if e["group"] in u["groups"]]
        v = version_at(e["date"], changes)
        counts = [c["top100"] for c in e["cars"] if c.get("top100")]
        if v and counts:
            per.setdefault((v, e["group"]), []).append(effective_cars(counts))
    out: dict[str, dict] = {}
    for (v, g), vals in per.items():
        out.setdefault(v, {})[g] = {"cars": round(sum(vals) / len(vals), 1), "events": len(vals)}
    return out


def _counts(entries: list[dict]) -> dict:
    c = {"buff": 0, "nerf": 0, "mixed": 0}
    for e in entries:
        c[e["verdict"]] = c.get(e["verdict"], 0) + 1
    return c
