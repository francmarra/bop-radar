"""This week's (and next week's) Daily Races from gtsh-rank.com, joined with our per-track ratings.

Leaderboard leaders are shown on the cards; only the car is read, never the player."""

import html
import re

from gt7bop.leaderboards import GROUPS, _find

CARD_RE = re.compile(r"<article class=\"daily-race-card([^\"]*)\">(.*?)</article>", re.DOTALL)
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
