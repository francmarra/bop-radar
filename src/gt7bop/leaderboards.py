"""Daily Race time-trial leaderboards: events and car names from gtsh-rank.com, laps from gtstats.live
(both mirror the official GT7 data).

Only per-car aggregates are kept — never player names or ids."""

import json
import re
import statistics
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

BASE = "https://gtsh-rank.com"
STATS = "https://gtstats.live"  # gtsh gated its lap API on 2026-11-08 (401)
USER_AGENT = "Mozilla/5.0 (compatible; bop-radar/0.1; +https://github.com/francmarra/bop-radar)"
DELAY_S = 2.0
GROUPS = {"Gr.1": "gr1", "Gr.2": "gr2", "Gr.3": "gr3", "Gr.4": "gr4"}
TOP_K = 20  # a car's pace = median of its best K laps
MIN_LAPS = 5
DEPTH = 500  # laps read per event (top of the leaderboard = representative pace); gtstats serves the top 500

BOARD_RE = re.compile(r"p_rt_\d+_\d+")
URL_RE = re.compile(r"/daily/leaderboard/\?event=[A-Za-z0-9_\-=]+")
DATE_RE = re.compile(r"\d{4}-\d\d-\d\d")
ARTICLE_RE = re.compile(r"<article class=\"daily-race-card[^\"]*\">(.*?)</article>", re.DOTALL)


def _get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode("utf-8", errors="replace")


def _find(pattern: str, text: str) -> str:
    m = re.search(pattern, text, re.DOTALL)
    return m.group(1).strip() if m else ""


def parse_week_page(html: str) -> list[dict]:
    """Event cards of an archive page; only finished/running BoP events of Gr.1-4."""
    events = []
    for card in ARTICLE_RE.findall(html):
        cats = re.findall(r'class="daily-category([^"]*)">([^<]+)<', card)
        if any("is-specified" in cls for cls, _ in cats):  # one-make race, says nothing about BoP
            continue
        category = next((c.strip() for _, c in cats if c.strip() in GROUPS), "")
        if not category or "upcoming" in card:
            continue
        if _find(r"<span>BoP</span><strong>([^<]+)<", card) != "On":
            continue
        events.append({
            "date": _find(r'href="/daily/week/(\d{4}-\d\d-\d\d)/"', card),  # week start
            "board": _find(r'data-board="([^"]+)"', card),
            "race": _find(r'class="daily-letter">([A-Z])<', card),
            "track": _find(r'<h2 title="([^"]+)"', card),
            "course_id": _find(r'/images/course/(\d+)\.png', card),
            "group": GROUPS[category],
            "tyres": re.findall(r'class="tire-ring tire-[a-z]+ ?[^"]*"[^>]*>([A-Z]{2})<', card),
            "fuel": _find(r"<span>Fuel</span><strong>([^<]+)<", card),
            "tyre_wear": _find(r"<span>Tyres</span><strong>([^<]+)<", card),
            "final": "Running" not in card,
            "url": _find(r'class="daily-card-link" href="([^"]+)"', card).replace("leaderboard?", "leaderboard/?"),
        })
    # both values come from a third-party page: board names a file, url is fetched
    return [e for e in events if BOARD_RE.fullmatch(e["board"]) and URL_RE.fullmatch(e["url"])]


def effective_cars(counts: list[int]) -> float:
    """1 / sum of squared lap shares: 1.0 = one car sets every lap, 5.0 = as varied as five equally used cars."""
    total = sum(counts)
    return round(total * total / sum(c * c for c in counts), 1) if total else 0.0


def aggregate(ranking: list[dict], names: dict[str, str]) -> list[dict]:
    """Per-car pace from the top of a leaderboard."""
    laps: dict[int, list[int]] = defaultdict(list)
    for row in ranking:
        laps[row["ranking_stats"]["car_code"]].append(row["score"])
    if not laps:
        return []
    overall = sorted(t for ts in laps.values() for t in ts)
    ref = statistics.median(overall[:TOP_K])
    top100 = defaultdict(int)
    for row in ranking[:100]:
        top100[row["ranking_stats"]["car_code"]] += 1
    cars = []
    for code, ts in laps.items():
        if len(ts) < MIN_LAPS:
            continue
        ts.sort()
        pace = statistics.median(ts[:TOP_K])
        cars.append({
            "code": code, "name": names.get(f"#CAR{code}", str(code)), "laps": len(ts),
            "best_ms": ts[0], "pace_ms": round(pace), "gap_pct": round((pace / ref - 1) * 100, 3),
            "top100": top100[code],
        })
    cars.sort(key=lambda c: c["pace_ms"])
    return cars


def fetch_ranking(url: str, board: str, depth: int = DEPTH) -> tuple[list[dict], dict[str, str]]:
    """Car-name map from the gtsh event page + the top `depth` laps from gtstats."""
    names = json.loads(_find(r"const carNames = (\{.*?\});", _get(BASE + url)) or "{}")
    time.sleep(DELAY_S)
    event_id = int(board.split("_")[2]) - 1_000_000  # gtsh board p_rt_1015255_001 = gtstats event 15255
    rows = json.loads(_get(f"{STATS}/api/dailies/{event_id}/times")).get("list", [])
    return rows[:depth], names


def update(out_dir: Path, pages: int = 13, log=print) -> int:
    """Scan archive pages (2 weeks each) and aggregate finished leaderboards not stored yet."""
    out_dir.mkdir(parents=True, exist_ok=True)
    added = 0
    for page in range(1, pages + 1):
        html = _get(f"{BASE}/daily/" + (f"?page={page}" if page > 1 else ""))
        time.sleep(DELAY_S)
        for ev in parse_week_page(html):
            path = out_dir / f"{ev['board']}.json"
            # running events are re-read once archived; the date dates the BoP version, so no date = skip
            if not ev.pop("final") or path.exists() or not DATE_RE.fullmatch(ev["date"]):
                continue
            log(f"leaderboard {ev['board']} {ev['group']} {ev['track']}")
            cars = aggregate(*fetch_ranking(ev.pop("url"), ev["board"]))
            if cars:
                path.write_text(json.dumps({**ev, "cars": cars}, ensure_ascii=False, indent=0),
                                encoding="utf-8")
                added += 1
    return added
