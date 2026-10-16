from gt7bop.ranking import rank_by_pace, tier_of


def _lb(gap, events=1, laps=100):
    return {"gap_pct": gap, "laps": laps, "top100": 0, "events": events}


def _combo(tid, s, cars):
    return {"id": tid, "name": tid, "set": s, "groups": {"gr3": {"events": [], "cars": cars}}}


GROUPS = {"gr3": {"versions": [], "cars": [
    {"id": "a", "name": "A car", "fit": {"h": .2, "m": .9, "l": .5}},
    {"id": "b", "name": "B car", "fit": {"h": .2, "m": .5, "l": .5}},
    {"id": "c", "name": "C car", "fit": {"h": .2, "m": .6, "l": .5}},
    {"id": "d", "name": "D car", "fit": {"h": .9, "m": .1, "l": .1}},  # appears in no combo
]}}
COMBOS = [
    _combo("t1", "m", [{"id": "b", "lb": _lb(0.2)}, {"id": "c", "lb": _lb(0.1)}, {"id": "a", "lb": None}]),
    _combo("t2", "m", [{"id": "b", "lb": _lb(0.2, events=3)}, {"id": "a", "lb": None}]),
    _combo("t3", "h", [{"id": "a", "lb": None}]),
]


def test_real_pace_beats_model_and_one_track_is_not_enough():
    r = rank_by_pace(COMBOS, GROUPS)["gr3"]
    mid = sorted(r, key=lambda cid: r[cid]["m"]["rank"])
    assert mid[:3] == ["b", "a", "c"]
    assert r["b"]["m"]["source"] == "real" and r["b"]["m"]["tracks"] == 2 and r["b"]["m"]["laps"] == 200
    assert r["c"]["m"]["source"] == "estimate" and r["c"]["m"]["tracks"] == 1
    assert r["b"]["m"]["score"] == round(0.7 * (1 - 0.2 / 3) + 0.3 * 0.5, 3)


def test_gap_weighted_by_events():
    combos = [_combo("t1", "m", [{"id": "b", "lb": _lb(0.0, events=3)}]), _combo("t2", "m", [{"id": "b", "lb": _lb(3.0, events=1)}])]
    r = rank_by_pace(combos, GROUPS)["gr3"]["b"]["m"]
    assert r["score"] == round(0.7 * (1 - 0.75 / 3) + 0.3 * 0.5, 3)


def test_no_data_orders_by_model_ties_by_name_and_keeps_every_car():
    r = rank_by_pace(COMBOS, GROUPS)["gr3"]
    assert set(r) == {"a", "b", "c", "d"}
    high = sorted(r, key=lambda cid: r[cid]["h"]["rank"])
    assert high == ["d", "a", "b", "c"]  # d by fit; a/b/c tie at .2 -> by name
    assert all(r[c]["h"]["source"] == "estimate" for c in r)


def test_tiers():
    assert [tier_of(i, 10) for i in (1, 2, 4, 7, 8)] == ["S", "A", "B", "B", "C"]


def _lbw(gap, weight=1.0, laps=100, fresh=True):
    return {"gap_pct": gap, "laps": laps, "top100": 0, "events": 1, "weight": weight, "fresh": fresh}


def test_stale_or_thin_layouts_do_not_count_as_real():
    combos = [_combo("t1", "m", [{"id": "b", "lb": _lbw(0.1, fresh=False)}]),
              _combo("t2", "m", [{"id": "b", "lb": _lbw(0.1)}]),
              _combo("t3", "m", [{"id": "c", "lb": _lbw(0.1, laps=3)}]),
              _combo("t4", "m", [{"id": "c", "lb": _lbw(0.1)}])]
    r = rank_by_pace(combos, GROUPS)["gr3"]
    assert r["b"]["m"]["source"] == "estimate" and r["b"]["m"]["tracks"] == 1  # only one fresh layout
    assert r["c"]["m"]["source"] == "estimate" and r["c"]["m"]["tracks"] == 1  # 3 laps is not evidence


def test_layouts_weighted_by_recency_weight_not_event_count():
    combos = [_combo("t1", "m", [{"id": "b", "lb": _lbw(0.0, weight=3.0)}]), _combo("t2", "m", [{"id": "b", "lb": _lbw(3.0, weight=1.0)}])]
    assert rank_by_pace(combos, GROUPS)["gr3"]["b"]["m"]["score"] == round(0.7 * (1 - 0.75 / 3) + 0.3 * 0.5, 3)


def test_estimates_never_rank_above_the_median_real_car():
    groups = {"gr3": {"versions": [], "cars": [
        {"id": "fast", "name": "Fast", "fit": {s: .2 for s in "hml"}},
        {"id": "mid", "name": "Mid", "fit": {s: .2 for s in "hml"}},
        {"id": "slow", "name": "Slow", "fit": {s: .2 for s in "hml"}},
        {"id": "ghost", "name": "Ghost", "fit": {s: 1.0 for s in "hml"}},  # great model fit, never raced
    ]}}
    combos = [_combo(f"t{i}", "m", [{"id": "fast", "lb": _lbw(0.0)}, {"id": "mid", "lb": _lbw(1.5)}, {"id": "slow", "lb": _lbw(2.7)}]) for i in (1, 2)]
    r = rank_by_pace(combos, groups)["gr3"]
    assert r["ghost"]["m"]["rank"] > r["fast"]["m"]["rank"]
    assert r["ghost"]["m"]["score"] <= r["mid"]["m"]["score"]
