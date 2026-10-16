from gt7bop.evaluate import evaluate, spearman


def test_spearman():
    assert spearman([1, 2, 3], [1, 2, 3]) == 1.0
    assert spearman([1, 2, 3], [3, 2, 1]) == -1.0
    assert round(spearman([1, 2, 2, 4], [1, 2, 3, 4]), 3) == 0.949


def _event(day, track, order):
    return {"date": day, "track": track, "group": "gr3", "race": "B", "tyres": [], "fuel": "", "tyre_wear": "", "board": day,
            "cars": [{"name": f"Maker Car{i}", "laps": 50, "best_ms": 0, "pace_ms": 0, "gap_pct": g, "top100": 0}
                     for g, i in enumerate(order)]}


def test_evaluate_is_time_respecting_and_compares_with_pp():
    n = 8
    cars = [{"id": f"c{i}", "name": f"Car{i}", "maker": "Maker", "fit": {s: 1 - i / 10 for s in "hml"},
             "changed_versions": [], "pp_rank": {s: n - i for s in "hml"}} for i in range(n)]
    groups = {"gr3": {"versions": [("1.0", "2020-01-01")], "cars": cars}}
    order = list(range(n))  # car0 fastest ... matches the model, opposite of PP
    events = [_event("2026-01-05", "Circuit de Spa-Francorchamps", order), _event("2026-02-05", "Suzuka Circuit", order),
              _event("2026-03-05", "Circuit de Spa-Francorchamps", order)]
    res = evaluate(events, groups, min_cars=8)
    assert res["events"] == 3
    assert res["rho_pace"] > 0.9 and res["rho_pp"] < -0.9
    assert evaluate(events, groups, min_cars=9)["events"] == 0


def test_evaluate_reports_win_rate_and_ignores_other_groups():
    n = 8
    cars = [{"id": f"c{i}", "name": f"Car{i}", "maker": "Maker", "fit": {s: 1 - i / 10 for s in "hml"},
             "changed_versions": [], "pp_rank": {s: n - i for s in "hml"}} for i in range(n)]
    groups = {g: {"versions": [("1.0", "2020-01-01")], "cars": cars} for g in ("gr1", "gr3")}
    events = [_event("2026-01-05", "Suzuka Circuit", list(range(n)))]
    events.append({**_event("2026-01-06", "Suzuka Circuit", list(range(n))), "group": "gr1"})
    res = evaluate(events, groups, min_cars=8)
    assert res["events"] == 1 and res["pace_wins"] == 1.0


def test_as_of_hides_future_bop_changes():
    from gt7bop.evaluate import _as_of
    groups = {"gr3": {"versions": [("1.0", "2026-01-01"), ("1.1", "2026-06-01")], "cars": [{"id": "x", "changed_versions": ["1.0", "1.1"]}]}}
    assert _as_of(groups, "2026-03-01")["gr3"]["cars"][0]["changed_versions"] == ["1.0"]
    assert groups["gr3"]["cars"][0]["changed_versions"] == ["1.0", "1.1"]  # input untouched
