"""Track layouts, their BoP set (H/M/L) and per-track car ratings from leaderboards."""

import json
import re
import unicodedata
from datetime import date
from pathlib import Path

from gt7bop.build import version_key

# (words that must all appear in the layout name, set); first match wins.
# Classes follow ddm999/gt7info track-bop.txt (MIT-0); unknown layouts default to mid-speed.
SET_RULES = [
    (("blue moon", "infield a"), "m"), (("blue moon", "infield b"), "h"), (("blue moon",), "h"),
    (("tokyo", "central"), "m"), (("tokyo",), "h"),
    (("sainte-croix", "- c"), "h"), (("sainte-croix",), "m"),
    (("maggiore", "centre"), "l"), (("maggiore", "east end"), "m"), (("maggiore", "east"), "l"), (("maggiore",), "m"),
    (("sardegna", "road track - a"), "m"), (("sardegna", "road track"), "l"),
    (("willow", "big"), "m"), (("willow",), "l"),
    (("brands hatch", "indy"), "l"), (("alsace", "village"), "l"),
    (("tsukuba",), "l"), (("laguna seca",), "l"),
    (("daytona",), "h"), (("sarthe",), "h"), (("le mans",), "h"), (("du mans",), "h"), (("monza",), "h"), (("panorama",), "h"),
    (("watkins",), "h"), (("deep forest",), "h"), (("northern isle",), "h"), (("bb raceway",), "h"),
    (("high speed ring",), "h"), (("route x",), "h"),
]
# Main circuits offered in the selector even without leaderboard data yet
COMMON_TRACKS = [
    "24 Heures du Mans Racing Circuit", "Autodromo Nazionale Monza", "Daytona Road Course", "Mount Panorama Motor Racing Circuit",
    "Watkins Glen International Long Course", "Circuit de Spa-Francorchamps", "Suzuka Circuit", "Fuji International Speedway",
    "Nürburgring GP", "Nürburgring Nordschleife", "Autódromo de Interlagos", "Circuit de Barcelona-Catalunya GP Layout",
    "Red Bull Ring", "Kyoto Driving Park - Yamagiwa", "Dragon Trail - Seaside", "Trial Mountain Circuit",
    "Brands Hatch Grand Prix Circuit", "Circuit Gilles-Villeneuve", "Tsukuba Circuit", "WeatherTech Raceway Laguna Seca",
    "Sardegna - Road Track - B", "Autodrome Lago Maggiore - Full Course", "Tokyo Expressway - East Clockwise",
]


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", text.lower().replace("'", "")).strip()


def track_set(name: str) -> str:
    n = _norm(name)
    for words, s in SET_RULES:
        if all(w in n for w in words):
            return s
    return "m"


def track_id(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", _norm(name)).strip("-")


def load_events(folder: Path) -> list[dict]:
    if not folder.exists():
        return []
    events = [json.loads(p.read_text(encoding="utf-8")) for p in folder.glob("*.json")]
    return sorted(events, key=lambda e: e["date"], reverse=True)


class CarMatcher:
    """Map leaderboard names ('Jaguar F-type Gr.3') onto our cars ('F-type Gr.3' by Jaguar)."""

    def __init__(self, cars: list[dict]):
        self.cars = [(c, _norm(f"{c['maker']} {c['name']}"), _norm(c["name"])) for c in cars]

    def match(self, lb_name: str) -> dict | None:
        n = _norm(lb_name)
        exact = [c for c, full, _ in self.cars if full == n]
        if exact:
            return exact[0]
        tail = [(len(short), c) for c, _, short in self.cars if len(short) >= 4 and n.endswith(short)]
        return max(tail, key=lambda t: t[0])[1] if tail else None


def version_at(day: str, versions: list[tuple[str, str]]) -> str | None:
    """BoP version in force on a given date."""
    past = [v for v, d in versions if d <= day]
    return max(past, key=version_key) if past else None


def rate_combos(events: list[dict], groups: dict, today: date | None = None) -> list[dict]:
    """Per track layout and group: leaderboard evidence blended with the model's track-type fit.

    groups: group id -> {"versions": [(v, date)], "cars": [car dicts with id/name/maker/fit/changed_versions]}"""
    today = today or date.today()
    layouts: dict[str, dict] = {}
    for name in COMMON_TRACKS + [e["track"] for e in events]:
        layouts.setdefault(track_id(name), {"id": track_id(name), "name": name, "set": track_set(name)})

    by_layout: dict[tuple[str, str], list[dict]] = {}
    for e in events:
        by_layout.setdefault((track_id(e["track"]), e["group"]), []).append(e)

    out = []
    for tid, layout in sorted(layouts.items(), key=lambda kv: kv[1]["name"]):
        entry = {**layout, "groups": {}}
        for gid, g in groups.items():
            evs = by_layout.get((tid, gid), [])
            matcher = CarMatcher(g["cars"])
            evidence: dict[str, list[tuple[float, dict]]] = {}
            ev_meta = []
            for e in evs:
                bop_v = version_at(e["date"], g["versions"])
                ev_meta.append({"date": e["date"], "race": e["race"], "tyres": e["tyres"], "fuel": e["fuel"],
                                "tyre_wear": e["tyre_wear"], "bop": bop_v, "board": e["board"]})
                age_weeks = max(0, (today - date.fromisoformat(e["date"])).days / 7)
                for row in e["cars"]:
                    car = matcher.match(row["name"])
                    if not car:
                        continue
                    stale = any(version_key(v) > version_key(bop_v or "0.0") for v in car["changed_versions"])
                    w = 0.5 ** (age_weeks / 26) * (0.4 if stale else 1.0)  # half-life 6 months, BoP since then
                    evidence.setdefault(car["id"], []).append((w, row))
            if not evs and gid not in ("gr3", "gr4"):
                continue  # Gr.1/Gr.2 rarely run dailies: only show them where we have data
            cars = []
            for car in g["cars"]:
                model = car["fit"][layout["set"]]
                rows = evidence.get(car["id"], [])
                lb = None
                if rows:
                    tw = sum(w for w, _ in rows)
                    gap = sum(w * r["gap_pct"] for w, r in rows) / tw
                    lb = {"gap_pct": round(gap, 3), "laps": sum(r["laps"] for _, r in rows),
                          "top100": sum(r["top100"] for _, r in rows), "events": len(rows)}
                    lb_score = max(0.0, 1 - gap / 3)  # 0 % gap -> 1, 3 % or more -> 0
                    score = 0.7 * lb_score + 0.3 * model
                else:
                    score = model * 0.85  # unproven on this layout: slight penalty
                cars.append({"id": car["id"], "score": round(score, 3), "model": model, "lb": lb})
            cars.sort(key=lambda c: -c["score"])
            for i, c in enumerate(cars):
                share = (i + 1) / len(cars)
                c["tier"] = "S" if share <= 0.10 else "A" if share <= 0.35 else "B" if share <= 0.70 else "C"
            entry["groups"][gid] = {"events": ev_meta, "cars": cars}
        if entry["groups"]:
            out.append(entry)
    return out
