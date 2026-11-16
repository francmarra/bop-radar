from gt7bop.export import apply_ranking


def test_apply_ranking_rewires_sets_best_set_brief_and_car_files():
    groups = [{"id": "gr3", "cars": [
        {"id": "x", "sets": {s: {"rank": 1, "tier": "S", "pp": 700.0} for s in "hml"}, "best_set": "m",
         "brief": {"rank": 1, "tier": "S", "best_set": "m", "of": 2}},
        {"id": "y", "sets": {s: {"rank": 2, "tier": "A", "pp": 690.0} for s in "hml"}, "best_set": "m",
         "brief": {"rank": 2, "tier": "A", "best_set": "m", "of": 2}},
    ]}]
    car_files = {"x": {}, "y": {}}
    ranking = {"gr3": {
        "x": {"h": {"rank": 2, "tier": "A", "source": "estimate", "tracks": 0, "laps": 0, "score": .3},
              "m": {"rank": 2, "tier": "A", "source": "estimate", "tracks": 1, "laps": 10, "score": .4},
              "l": {"rank": 2, "tier": "A", "source": "estimate", "tracks": 0, "laps": 0, "score": .3}},
        "y": {"h": {"rank": 1, "tier": "S", "source": "estimate", "tracks": 0, "laps": 0, "score": .5},
              "m": {"rank": 1, "tier": "S", "source": "real", "tracks": 3, "laps": 900, "score": .9},
              "l": {"rank": 1, "tier": "S", "source": "estimate", "tracks": 0, "laps": 0, "score": .5}},
    }}
    apply_ranking(groups, car_files, ranking)
    cars = groups[0]["cars"]
    assert [c["id"] for c in cars] == ["y", "x"]  # re-sorted by mid rank
    y = cars[0]
    assert y["sets"]["m"] == {"rank": 1, "tier": "S", "source": "real", "tracks": 3, "laps": 900, "score": .9, "pp": 690.0, "pp_rank": 2}
    assert y["best_set"] == "m"  # all ranks equal -> mid wins the tie
    assert y["brief"]["rank"] == 1 and y["brief"]["tier"] == "S" and y["brief"]["of"] == 2
    assert car_files["y"]["now"] == y["sets"]


def test_apply_ranking_keeps_cars_without_ranking():
    groups = [{"id": "gr4", "cars": [{"id": "z", "sets": {"m": {"rank": 1, "tier": "S", "pp": 1.0}}, "best_set": "m", "brief": {}}]}]
    apply_ranking(groups, {"z": {}}, {})
    assert groups[0]["cars"][0]["sets"]["m"]["rank"] == 1


def test_effective_cars():
    from gt7bop.leaderboards import effective_cars
    assert effective_cars([100]) == 1.0
    assert effective_cars([25, 25, 25, 25]) == 4.0
    assert effective_cars([90, 10]) == 1.2
    assert effective_cars([]) == 0.0


def test_balance_per_version_and_group():
    from gt7bop.export import _balance
    updates = {"1.60": {"date": "2025-06-01", "groups": {"gr3": [], "gr4": []}},
               "1.61": {"date": "2025-07-01", "groups": {"gr4": []}}}
    ev = lambda d, g, counts: {"date": d, "group": g, "cars": [{"top100": c} for c in counts]}
    events = [ev("2025-06-10", "gr3", [50, 50]), ev("2025-07-10", "gr3", [100]),  # gr3 did not change in 1.61
              ev("2025-06-20", "gr4", [100]), ev("2025-07-05", "gr4", [25, 25, 25, 25]),
              ev("2025-05-01", "gr3", [100])]  # before any known change: ignored
    assert _balance(events, updates) == {"1.60": {"gr3": {"cars": 1.5, "events": 2}, "gr4": {"cars": 1.0, "events": 1}},
                                         "1.61": {"gr4": {"cars": 4.0, "events": 1}}}


def _export(tmp_path, measured, name="out"):
    from test_assess import comps

    from gt7bop.assess import assess_group
    from gt7bop.build import build_group
    from gt7bop.export import export, slug
    hist = build_group("gr3", comps())
    out = tmp_path / name
    export([hist], {"gr3": assess_group(hist)}, out, tmp_path / "notes", [], measured=measured)
    return out / "cars", slug("Car A"), slug("Car B")


MEASURE = {"track": "spa", "compound": "RS", "fuel_pct_per_lap": 2.7, "grip_loss_pct_per_lap": 0.4,
           "laps": 8, "sessions": 1, "date": "2026-11-02"}


def test_export_adds_measured_for_that_car_only(tmp_path):
    import json
    cars, a, b = _export(tmp_path, {"car-a": [MEASURE]})
    assert a == "car-a"
    assert json.loads((cars / f"{a}.json").read_text(encoding="utf-8"))["measured"] == [MEASURE]
    assert "measured" not in json.loads((cars / f"{b}.json").read_text(encoding="utf-8"))


def test_export_without_measured_is_unchanged(tmp_path):
    none, a, b = _export(tmp_path, None, "none")
    empty, _, _ = _export(tmp_path, {}, "empty")
    for s in (a, b):
        assert (none / f"{s}.json").read_bytes() == (empty / f"{s}.json").read_bytes()
