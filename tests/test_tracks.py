from datetime import date

from gt7bop.tracks import CarMatcher, rate_combos, track_set, version_at


def test_track_set():
    assert track_set("24 Heures du Mans Racing Circuit") == "h"
    assert track_set("Autodrome Lago Maggiore - Centre") == "l"
    assert track_set("Autodrome Lago Maggiore - Full Course Reverse") == "m"
    assert track_set("Sardegna - Road Track - B") == "l"
    assert track_set("Circuit de Spa-Francorchamps") == "m"


CARS = [
    {"id": "f-type", "name": "F-type Gr.3", "maker": "Jaguar", "fit": {"h": .5, "m": .6, "l": .4}, "changed_versions": ["1.70"]},
    {"id": "amg16", "name": "Mercedes-AMG GT3 '16", "maker": "AMG", "fit": {"h": .9, "m": .9, "l": .9}, "changed_versions": []},
]


def test_matcher():
    m = CarMatcher(CARS)
    assert m.match("Jaguar F-type Gr.3")["id"] == "f-type"
    assert m.match("Mercedes-AMG GT3 '16")["id"] == "amg16"
    assert m.match("Nissan GT-R") is None


def test_version_at():
    assert version_at("2026-07-01", [("1.70", "2026-06-11"), ("1.71", "2026-08-20")]) == "1.70"


def test_leaderboard_beats_model():
    ev = {"date": "2026-10-05", "race": "B", "track": "Circuit de Spa-Francorchamps", "group": "gr3", "board": "x",
          "tyres": ["RM"], "fuel": "x1", "tyre_wear": "x1",
          "cars": [{"name": "Jaguar F-type Gr.3", "gap_pct": 0.0, "laps": 50, "top100": 40}]}
    groups = {"gr3": {"versions": [("1.71", "2026-08-20")], "cars": CARS}}
    spa = next(t for t in rate_combos([ev], groups, today=date(2026, 10, 16)) if t["id"] == "circuit-de-spa-francorchamps")
    cars = spa["groups"]["gr3"]["cars"]
    assert cars[0]["id"] == "f-type" and cars[0]["lb"]["events"] == 1  # proven pace beats a better model fit
    assert cars[1]["lb"] is None
