"""Backtest: how well does each ranking predict the finishing order of a Daily Race it has not seen?

Time-respecting: every event is predicted only from events that happened before it."""

from statistics import mean

from gt7bop.ranking import rank_by_pace
from gt7bop.tracks import CarMatcher, rate_combos, track_set


def _ranks(xs: list[float]) -> list[float]:
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    ranks = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        for k in range(i, j + 1):
            ranks[order[k]] = (i + j) / 2 + 1  # ties share their average rank
        i = j + 1
    return ranks


def spearman(xs: list[float], ys: list[float]) -> float:
    rx, ry = _ranks(xs), _ranks(ys)
    mx, my = mean(rx), mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return num / den if den else 0.0


def evaluate(events: list[dict], groups: dict, min_cars: int = 8) -> dict:
    """groups: the rate_combos input, each car also carrying "pp_rank": {set: rank}."""
    rho_pace, rho_pp = [], []
    for e in sorted(events, key=lambda e: e["date"]):
        g = groups.get(e["group"])
        if not g:
            continue
        matcher = CarMatcher(g["cars"])
        seen, rows = set(), []
        for row in e["cars"]:
            car = matcher.match(row["name"])
            if car and car["id"] not in seen:
                seen.add(car["id"])
                rows.append((car, row["gap_pct"]))
        if len(rows) < min_cars:
            continue
        past = [p for p in events if p["date"] < e["date"]]
        ranking = rank_by_pace(rate_combos(past, groups), groups)[e["group"]]
        s = track_set(e["track"])
        actual = [gap for _, gap in rows]
        rho_pace.append(spearman([ranking[c["id"]][s]["rank"] for c, _ in rows], actual))
        rho_pp.append(spearman([c["pp_rank"][s] for c, _ in rows], actual))
    return {"events": len(rho_pace), "rho_pace": round(mean(rho_pace), 3) if rho_pace else 0.0,
            "rho_pp": round(mean(rho_pp), 3) if rho_pp else 0.0}
