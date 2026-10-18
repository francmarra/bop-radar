"""This week's (and next week's) Daily Races from gtsh-rank.com, joined with our per-track ratings.

Leaderboard leaders are shown on the cards; only the car is read, never the player."""

import html
import json
import re
from datetime import date
from pathlib import Path

from gt7bop.leaderboards import BASE, GROUPS, _find, _get, aggregate, fetch_ranking, parse_week_page
from gt7bop.tracks import CarMatcher, track_id, track_set

CARD_RE = re.compile(r"<article class=\"daily-race-card([^\"]*)\">(.*?)</article>", re.DOTALL)
SET_STRENGTHS = {"h": ["straight-line speed", "high-speed cornering"], "m": ["high-speed cornering", "acceleration"],
                 "l": ["low-speed cornering", "acceleration"]}
TOP_N = 5
LIVE_MIN_LAPS = 200  # early in the week a running board is too thin to beat the history
TYRE_RE = re.compile(r'class="tire-ring tire-[a-z]+ ?[^"]*"[^>]*>([A-Z]{1,2})<')


def parse_schedule(page: str) -> list[dict]:
    """Every race card on /daily/ page 1: the running week plus the "next week" preview."""
    races = []
    for cls, card in CARD_RE.findall(page):
        cats = re.findall(r'class="daily-category([^"]*)">([^<]+)<', card)
        category = cats[0][1].strip() if cats else ""
        one_make = any("is-specified" in c for c, _ in cats)
        bop = _find(r"<span>BoP</span><strong>([^<]+)<", card) == "On"
        nxt = "is-next" in cls
        if nxt:
            kind = "tbd"  # the preview does not name the class yet
        elif one_make:
            kind = "one-make"
        elif category in GROUPS and bop:
            kind = "bop"
        else:
            kind = "other"
        races.append({
            "race": _find(r'class="daily-letter">([A-Z])<', card),
            "week": "next" if nxt else "this",
            "start": _find(r'href="/daily/week/(\d{4}-\d{2}-\d{2})/"', card) or None,
            "track": html.unescape(_find(r'<h2 title="([^"]+)"', card)),
            "course_id": _find(r"/images/course/(\d+)\.png", card),
            "category": html.unescape(category),
            "kind": kind,
            "car": html.unescape(_find(r'data-car-name="([^"]+)"', card)) if kind == "one-make" else None,
            "tyres": TYRE_RE.findall(card),
            "fuel": _find(r"<span>Fuel</span><strong>([^<]+)<", card),
            "tyre_wear": _find(r"<span>Tyres</span><strong>([^<]+)<", card),
            "bop": bop,
        })
    return races


def _multiplier(text: str) -> float:
    m = re.search(r"[\d.]+", text or "")
    return float(m.group()) if m else 1.0


def live_rankings(page: str, ranking=fetch_ranking, log=print) -> dict[str, tuple[list[dict], dict]]:
    """Race letter -> (top laps, car names) of this week's running BoP races; a failed board is just skipped."""
    out = {}
    for ev in parse_week_page(page):
        if ev["final"]:
            continue
        try:
            out[ev["race"]] = ranking(ev["url"])
        except Exception as e:  # noqa: BLE001 — the race falls back to the history
            log(f"week: no live data for race {ev['race']} ({e})")
    return out


def _live_cars(rows: list[dict], names: dict, cars: list[dict]) -> list[tuple[str, int, int]]:
    """(car id, laps, % of the board) in this week's pace order, mapped onto our cars."""
    matcher, seen, out = CarMatcher(cars), set(), []
    for c in aggregate(rows, names)[1]:
        car = matcher.match(c["name"])
        if car and car["id"] not in seen:
            seen.add(car["id"])
            out.append((car["id"], c["laps"], round(c["laps"] / len(rows) * 100)))
    return out[:TOP_N]


def build_week(schedule: list[dict], tracks: list[dict], index: dict, generated: str, live: dict | None = None) -> dict:
    """live: race letter -> (top laps, car names) of this week's running boards (see live_rankings)."""
    combos = {t["id"]: t for t in tracks}
    briefs = {(g["id"], c["id"]): c for g in index["groups"] for c in g["cars"]}
    weeks = {"this": [], "next": []}
    for r in schedule:
        group = GROUPS.get(r["category"]) if r["kind"] == "bop" else None
        combo = combos.get(track_id(r["track"]))
        race = {k: v for k, v in r.items() if k not in ("bop", "week")}
        race["group"] = group
        race["track_set"] = combo["set"] if combo else track_set(r["track"])
        race["cars"] = []
        history = combo["groups"][group]["cars"] if group and combo and group in combo["groups"] else []
        rows, names = (live or {}).get(r["race"], ([], {})) if group and r["week"] == "this" else ([], {})
        if len(rows) >= LIVE_MIN_LAPS:
            tiers = {c["id"]: c["tier"] for c in history}
            group_cars = next((g["cars"] for g in index["groups"] if g["id"] == group), [])
            picks = [(cid, tiers.get(cid), {"source": "live", "laps": laps, "share": share})
                     for cid, laps, share in _live_cars(rows, names, group_cars)]
        else:
            picks = [(c["id"], c["tier"], {"source": "real" if c.get("lb") else "estimate",
                                           "laps": c["lb"]["laps"] if c.get("lb") else None}) for c in history[:TOP_N]]
        hard_on_tyres = _multiplier(r["tyre_wear"]) >= 4
        for cid, tier, src in picks:
            info = briefs.get((group, cid), {})
            brief = info.get("brief") or {}
            race["cars"].append({
                "id": cid, "name": info.get("name", cid), "tier": tier, **src,
                "why": {"strengths": [s for s in brief.get("strengths", []) if s in SET_STRENGTHS[race["track_set"]]],
                        "saves_tyres": hard_on_tyres and brief.get("tyre_wear") == "low"},
            })
        weeks[r["week"]].append(race)
    return {"generated": generated, "weeks": [{"label": k, "races": v} for k, v in weeks.items()]}


def update_week(out: Path, fetch=_get, log=print, ranking=fetch_ranking) -> bool:
    """Refresh out/week.json; on any failure keep the previous file."""
    try:
        page = fetch(f"{BASE}/daily/")
        schedule = parse_schedule(page)
        if not schedule:
            raise ValueError("no race cards found (page layout changed?)")
        for r in schedule:  # a partial markup change must not publish wrong guidance
            if not r["race"] or not r["track"] or (r["week"] == "this" and not r["category"]):
                raise ValueError(f"incomplete race card {r['race'] or '?'} (page layout changed?)")
        tracks = json.loads((out / "tracks.json").read_text(encoding="utf-8"))
        index = json.loads((out / "index.json").read_text(encoding="utf-8"))
        week = build_week(schedule, tracks, index, date.today().isoformat(), live_rankings(page, ranking, log))
    except Exception as e:  # noqa: BLE001 — network, markup or data problems must not break the weekly job
        log(f"week: kept previous week.json ({e})")
        return False
    (out / "week.json").write_text(json.dumps(week, ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"week: {sum(len(w['races']) for w in week['weeks'])} races")
    return True
