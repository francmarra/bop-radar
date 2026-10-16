"""Class ranking per BoP track type from real Daily Race pace, with the model as fallback.

Same blend as the per-track rating in `tracks.rate_combos`, aggregated over every layout of a track type,
so a car's class rank and its per-track ranks tell one consistent story."""

from statistics import median

SETS = ("h", "m", "l")
MIN_TRACKS = 2  # real pace must come from at least two layouts of the type
MIN_LAPS = 10  # per layout; fewer laps say more about the drivers than the car


def tier_of(rank: int, total: int) -> str:
    share = rank / total
    return "S" if share <= 0.10 else "A" if share <= 0.35 else "B" if share <= 0.70 else "C"


def rank_by_pace(combos: list[dict], groups: dict) -> dict[str, dict[str, dict[str, dict]]]:
    """groups: the `rate_combos` input (group id -> {"cars": [{"id", "name", "fit"}]})."""
    out: dict[str, dict[str, dict[str, dict]]] = {}
    for gid, g in groups.items():
        cars = {c["id"]: c for c in g["cars"]}
        ranking = {cid: {} for cid in cars}
        for s in SETS:
            evidence: dict[str, list[dict]] = {}
            for combo in combos:
                if combo["set"] != s:
                    continue
                for c in combo["groups"].get(gid, {}).get("cars", []):
                    lb = c.get("lb")
                    # evidence counts only if it is under the car's current BoP and not a handful of laps
                    if lb and c["id"] in cars and lb.get("fresh", True) and lb["laps"] >= MIN_LAPS:
                        evidence.setdefault(c["id"], []).append(c["lb"])
            rows = []
            for cid, car in cars.items():
                lbs = evidence.get(cid, [])
                fit = car["fit"][s]
                entry = {"tracks": len(lbs), "laps": sum(lb["laps"] for lb in lbs)}
                if len(lbs) >= MIN_TRACKS:
                    weight = sum(lb.get("weight", lb["events"]) for lb in lbs)
                    gap = sum(lb["gap_pct"] * lb.get("weight", lb["events"]) for lb in lbs) / weight
                    entry.update(source="real", score=round(0.7 * max(0.0, 1 - gap / 3) + 0.3 * fit, 3))
                else:
                    entry.update(source="estimate", score=round(0.85 * fit, 3))
                rows.append((cid, car["name"], entry))
            real = [e["score"] for _, _, e in rows if e["source"] == "real"]
            if real:  # missing from the top-1000 laps is itself a hint: an unproven car stays at most mid-pack
                cap = round(median(real), 3)
                for _, _, e in rows:
                    if e["source"] == "estimate":
                        e["score"] = min(e["score"], cap)
            rows.sort(key=lambda r: (-r[2]["score"], r[1]))
            for i, (cid, _, entry) in enumerate(rows, 1):
                ranking[cid][s] = {"rank": i, "tier": tier_of(i, len(rows)), **entry}
        out[gid] = ranking
    return out
