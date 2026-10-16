"""Daily Race time-trial leaderboards (official GT7 data mirrored by gtsh-rank.com).

Only per-car aggregates are kept — never player names or ids."""

import json
import re
import statistics
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

BASE = "https://gtsh-rank.com"
USER_AGENT = "Mozilla/5.0 (compatible; gt7-bop/0.1; +https://github.com/francmarra/gt7-bop)"
DELAY_S = 2.0
GROUPS = {"Gr.1": "gr1", "Gr.2": "gr2", "Gr.3": "gr3", "Gr.4": "gr4"}
TOP_K = 20  # a car's pace = median of its best K laps
MIN_LAPS = 5
DEPTH = 1000  # laps read per event (top of the leaderboard = representative pace)
PAGE = 200  # the paging API's maximum

BOARD_RE = re.compile(r"p_rt_\d+_\d+")
URL_RE = re.compile(r"/daily/leaderboard/\?event=[A-Za-z0-9_\-=]+")
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


def aggregate(ranking: list[dict], names: dict[str, str]) -> tuple[str, list[dict]]:
    """(event date, per-car pace) from the top of a leaderboard."""
    laps: dict[int, list[int]] = defaultdict(list)
    for row in ranking:
        laps[row["ranking_stats"]["car_code"]].append(row["score"])
    if not laps:
        return "", []
    start = min(row["update_time"] for row in ranking)[:10]
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
    return start, cars


def fetch_ranking(url: str, depth: int = DEPTH) -> tuple[list[dict], dict[str, str]]:
    """Car-name map from the (small, archived) event page + the top `depth` laps via its paging API."""
    names = json.loads(_find(r"const carNames = (\{.*?\});", _get(BASE + url)) or "{}")
    rows: list[dict] = []
    for offset in range(0, depth, PAGE):
        time.sleep(DELAY_S)
        data = json.loads(_get(f"{BASE}{url}&page_data=1&offset={offset}&limit={PAGE}"))
        rows += data.get("board", [])
        if not data.get("has_more"):
            break
    return rows, names


def update(out_dir: Path, pages: int = 13, log=print) -> int:
    """Scan archive pages (2 weeks each) and aggregate finished leaderboards not stored yet."""
    out_dir.mkdir(parents=True, exist_ok=True)
    added = 0
    for page in range(1, pages + 1):
        html = _get(f"{BASE}/daily/" + (f"?page={page}" if page > 1 else ""))
        time.sleep(DELAY_S)
        for ev in parse_week_page(html):
            path = out_dir / f"{ev['board']}.json"
            if not ev.pop("final") or path.exists():  # running events are re-read once archived
                continue
            log(f"leaderboard {ev['board']} {ev['group']} {ev['track']}")
            date, cars = aggregate(*fetch_ranking(ev.pop("url")))
            if cars:
                path.write_text(json.dumps({"date": date, **ev, "cars": cars}, ensure_ascii=False, indent=0),
                                encoding="utf-8")
                added += 1
    return added
