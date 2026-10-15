"""Rank cars inside their group and turn the numbers into a short performance context."""

from bisect import bisect_left, bisect_right

from gt7bop.build import SETS, Car, GroupHistory

SET_NAMES = {"h": "high-speed", "m": "mid-speed", "l": "low-speed"}
# track -> BoP set, from ddm999/gt7info track-bop.txt (MIT-0)
EXAMPLE_TRACKS = {
    "h": ["Le Mans", "Monza", "Daytona Road Course", "Mount Panorama", "Watkins Glen"],
    "m": ["Spa-Francorchamps", "Suzuka", "Fuji", "Nürburgring GP", "Interlagos", "Catalunya", "Red Bull Ring"],
    "l": ["Tsukuba", "Laguna Seca", "Brands Hatch Indy", "Sardegna B", "Alsace Village"],
}
# metric, higher is better, label
STRENGTHS = [
    ("ps_per_t", True, "straight-line speed"),
    ("acc_100_150", False, "acceleration"),
    ("rotg_60", True, "low-speed cornering"),
    ("rotg_240", True, "high-speed cornering"),
]
# what each track type rewards (metric, higher is better), judged under that set's BoP
TRACK_TRAITS = {
    "h": [("ps_per_t", True), ("rotg_240", True)],
    "m": [("ps_per_t", True), ("rotg_120", True), ("acc_100_150", False)],
    "l": [("rotg_60", True), ("acc_100_150", False)],
}
DRIVETRAIN_WEAR ={"4WD": -0.15, "FF": 0.05}  # 4WD spreads the load over four tyres


def percentile(value, values: list, higher_better: bool = True) -> float | None:
    """Share of the group this value beats (0 = worst, 1 = best); ties share the middle."""
    nums = sorted(v for v in values if isinstance(v, (int, float)))
    if not isinstance(value, (int, float)) or len(nums) < 2:
        return None
    below, above = bisect_left(nums, value), len(nums) - bisect_right(nums, value)
    p = (below + (len(nums) - below - above - 1) / 2) / (len(nums) - 1)
    return round(p if higher_better else 1 - p, 3)


def tier(rank: int, total: int) -> str:
    share = rank / total
    return "S" if share <= 0.10 else "A" if share <= 0.35 else "B" if share <= 0.70 else "C"


def _level(score: float, scores: list[float]) -> str:
    p = percentile(score, scores)
    if p is None:
        return "medium"
    return "low" if p < 1 / 3 else "high" if p > 2 / 3 else "medium"


def assess_group(hist: GroupHistory) -> dict[str, list[dict]]:
    """car name -> list of per-version assessments (ascending version)."""
    out: dict[str, list[dict]] = {name: [] for name in hist.cars}
    for version, date in hist.versions:
        present = {n: c for n, c in hist.cars.items() if version in c.states}
        if not present:
            continue
        ranks = {s: _ranks(present, version, s) for s in SETS}
        wear, fuel = _wear_fuel_scores(present, version)
        for name, car in present.items():
            state = car.states[version]
            prev = _previous(out[name])
            entry = {
                "v": version,
                "date": date,
                "changed": version in car.changed,
                "sets": {s: {"rank": ranks[s][name], "tier": tier(ranks[s][name], len(present)),
                             **_compact(state[s])} for s in SETS},
                "of": len(present),
            }
            if prev:
                # show the mid-speed change, or the first set that changed if mid did not
                deltas = {s: _delta(prev["sets"][s], state[s]) for s in SETS}
                s = next((s for s in "mhl" if "power_ps" in deltas[s] or "weight_kg" in deltas[s]), "m")
                entry["delta"] = {**deltas[s], **({"set": s} if s != "m" else {})}
                entry["verdict"] = _verdict(prev, entry)
            entry["context"] = _context(car, version, present, ranks, wear, fuel)
            entry["summary"] = _summary(car, entry)
            out[name].append(entry)
    return out


def _ranks(present: dict[str, Car], version: str, s: str) -> dict[str, int]:
    order = sorted(present, key=lambda n: -(present[n].states[version][s].get("pp") or 0))
    return {n: i + 1 for i, n in enumerate(order)}


def _wear_fuel_scores(present: dict[str, Car], version: str):
    ms = {n: c.states[version]["m"] for n, c in present.items()}
    weights = [m.get("weight_kg") for m in ms.values()]
    torques = [m.get("torque_kgfm") for m in ms.values()]
    powers = [m.get("power_ps") for m in ms.values()]
    wear, fuel = {}, {}
    for n, m in ms.items():
        w = percentile(m.get("weight_kg"), weights) or 0.5
        t = percentile(m.get("torque_kgfm"), torques) or 0.5
        p = percentile(m.get("power_ps"), powers) or 0.5
        wear[n] = 0.55 * w + 0.45 * t + DRIVETRAIN_WEAR.get(present[n].drivetrain, 0)
        fuel[n] = 0.7 * p + 0.3 * t
    return wear, fuel


def _track_fit(car, version, present, ranks) -> dict[str, float]:
    """0..1 fit per BoP set: PP rank under that set's BoP plus the traits those tracks reward."""
    fit = {}
    for s, traits in TRACK_TRAITS.items():
        group = [c.states[version][s] for c in present.values()]
        mine = car.states[version][s]
        ps = [p for key, higher in traits
              if (p := percentile(mine.get(key), [g.get(key) for g in group], higher)) is not None]
        rank_p = 1 - (ranks[s][car.name] - 1) / max(1, len(present) - 1)
        fit[s] = round(0.5 * rank_p + 0.5 * (sum(ps) / len(ps) if ps else rank_p), 3)
    return fit


def _context(car, version, present, ranks, wear, fuel) -> dict:
    state = car.states[version]["m"]
    fit = _track_fit(car, version, present, ranks)
    best = max(SETS, key=lambda s: (fit[s], s == "m"))
    spread = max(fit.values()) - min(fit.values())
    strengths, weaknesses = [], []
    for key, higher, label in STRENGTHS:
        p = percentile(state.get(key), [c.states[version]["m"].get(key) for c in present.values()], higher)
        if p is None:
            continue
        if p >= 0.75:
            strengths.append(label)
        elif p <= 0.25:
            weaknesses.append(label)
    return {
        "best_set": best,
        "fit": fit,
        "all_rounder": spread < 0.08,
        "tracks": EXAMPLE_TRACKS[best],
        "strengths": strengths,
        "weaknesses": weaknesses,
        "tyre_wear": _level(wear[car.name], list(wear.values())),
        "fuel_use": _level(fuel[car.name], list(fuel.values())),
        "handling": {"low": state.get("stab_low_flag"), "high": state.get("stab_high_flag")},
    }


KEEP = ("pp", "power_ps", "torque_kgfm", "weight_kg", "ps_per_t", "balance", "acc_100_150",
        "rotg_60", "rotg_120", "rotg_240", "stab_low", "stab_high", "stab_low_flag", "stab_high_flag")


def _compact(metrics: dict) -> dict:
    return {k: metrics[k] for k in KEEP if metrics.get(k) is not None}


def _previous(entries: list[dict]) -> dict | None:
    return entries[-1] if entries else None


def _delta(old: dict, new: dict) -> dict:
    d = {}
    for k in ("pp", "power_ps", "weight_kg", "ps_per_t"):
        a, b = old.get(k), new.get(k)
        if isinstance(a, (int, float)) and isinstance(b, (int, float)) and a != b:
            d[k] = round(b - a, 2)
    return d


def _verdict(prev: dict, entry: dict) -> str:
    if not entry["changed"]:
        return "unchanged"
    # average power-to-weight change over the BoP sets that actually changed
    pcts = []
    for s in SETS:
        old, new = prev["sets"][s].get("ps_per_t"), entry["sets"][s].get("ps_per_t")
        if old and new and old != new:
            pcts.append((new - old) / old * 100)
    if not pcts:
        return "mixed"
    pct = sum(pcts) / len(pcts)
    return "buff" if pct > 0.25 else "nerf" if pct < -0.25 else "mixed"


def _summary(car: Car, e: dict) -> str:
    ctx, m = e["context"], e["sets"][e["context"]["best_set"]]
    parts = []
    d = e.get("delta", {})
    if e["changed"] and (d.get("power_ps") or d.get("weight_kg")):
        bits = []
        if d.get("power_ps"):
            bits.append(f"{d['power_ps']:+g} PS")
        if d.get("weight_kg"):
            bits.append(f"{d['weight_kg']:+g} kg")
        parts.append(f"{e['verdict'].capitalize()} ({', '.join(bits)}).")
    tracks = ", ".join(ctx["tracks"][:2])
    where = (f"an all-rounder with a slight edge on {SET_NAMES[ctx['best_set']]} tracks ({tracks})"
             if ctx["all_rounder"] else f"best suited to {SET_NAMES[ctx['best_set']]} tracks such as {tracks}")
    parts.append(f"Ranked {m['rank']}/{e['of']} ({m['tier']} tier), {where}.")
    if ctx["strengths"]:
        parts.append(f"Good at {', '.join(ctx['strengths'])}.")
    parts.append(f"Estimated tyre wear {ctx['tyre_wear']}, fuel use {ctx['fuel_use']}.")
    return " ".join(parts)
