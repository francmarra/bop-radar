from pathlib import Path

from gt7bop.week import parse_schedule

FIXTURE = (Path(__file__).parent / "fixtures" / "gtsh_daily.html").read_text(encoding="utf-8")


def test_parse_schedule_next_week():
    races = parse_schedule(FIXTURE)
    assert len(races) == 6
    nxt = [r for r in races if r["week"] == "next"]
    assert [r["track"] for r in nxt] == ["Circuit Gilles-Villeneuve", "Autódromo de Interlagos", "Suzuka Circuit"]
    assert all(r["kind"] == "tbd" and r["start"] == "2026-10-19" and r["car"] is None for r in nxt)
    suzuka = nxt[2]
    assert (suzuka["race"], suzuka["fuel"], suzuka["tyre_wear"], suzuka["tyres"]) == ("C", "x2", "x4", ["RM"])


def test_parse_schedule_current_week():
    cur = [r for r in parse_schedule(FIXTURE) if r["week"] == "this"]
    a, b, c = cur
    assert (a["race"], a["kind"], a["car"]) == ("A", "one-make", "Gran Turismo Red Bull X2014 Junior")
    assert (b["kind"], b["category"], b["car"], b["track"]) == ("bop", "Gr.3", None, "Circuit de Spa-Francorchamps")
    assert (c["category"], c["tyres"], c["bop"]) == ("Gr.4", ["RM", "RS"], True)


def test_player_names_never_parsed():
    for race in parse_schedule(FIXTURE):
        assert "Player" not in repr(race)


from gt7bop.week import build_week, live_rankings, update_week

TRACKS = [
    {"id": "circuit-de-spa-francorchamps", "name": "Circuit de Spa-Francorchamps", "set": "m", "groups": {"gr3": {"events": [], "cars": [
        {"id": "f-type", "score": .9, "model": .6, "lb": {"gap_pct": 0.0, "laps": 968, "top100": 99, "events": 1}, "tier": "S"},
        {"id": "genesis", "score": .7, "model": .7, "lb": None, "tier": "A"},
        {"id": "rsr", "score": .5, "model": .5, "lb": None, "tier": "B"},
    ]}}},
    {"id": "autodromo-de-interlagos", "name": "Autodromo de Interlagos", "set": "m", "groups": {"gr4": {"events": [], "cars": [
        {"id": "genesis", "score": .8, "model": .8, "lb": None, "tier": "S"},
    ]}}},
]
INDEX = {"groups": [{"id": "gr3", "label": "Gr.3", "cars": [
    {"id": "f-type", "name": "F-type Gr.3", "maker": "Jaguar", "brief": {"strengths": ["high-speed cornering", "low-speed cornering"], "tyre_wear": "low"}},
    {"id": "genesis", "name": "Genesis Gr.3", "maker": "Genesis", "brief": {"strengths": ["acceleration"], "tyre_wear": "high"}},
    {"id": "rsr", "name": "911 RSR", "maker": "Porsche", "brief": {"strengths": [], "tyre_wear": "low"}},
]}, {"id": "gr4", "label": "Gr.4", "cars": [
    {"id": "genesis", "name": "Genesis Gr.3", "maker": "Genesis", "brief": {"strengths": [], "tyre_wear": "medium"}},
]}]}


def _race(**kw):
    base = {"race": "B", "week": "this", "start": None, "track": "Circuit de Spa-Francorchamps", "course_id": "1", "category": "Gr.3",
            "kind": "bop", "car": None, "tyres": ["RM"], "fuel": "x1", "tyre_wear": "x5", "bop": True}
    return {**base, **kw}


def test_build_week_bop_race():
    week = build_week([_race()], TRACKS, INDEX, "2026-10-16")
    assert [w["label"] for w in week["weeks"]] == ["this", "next"]
    race = week["weeks"][0]["races"][0]
    assert race["group"] == "gr3" and race["track_set"] == "m" and "bop" not in race and race["category"] == "Gr.3"
    cars = race["cars"]
    assert [c["id"] for c in cars] == ["f-type", "genesis", "rsr"]
    assert cars[0] == {"id": "f-type", "name": "F-type Gr.3", "tier": "S", "source": "real", "laps": 968,
                       "why": {"strengths": ["high-speed cornering"], "saves_tyres": True}}
    assert cars[1]["source"] == "estimate" and cars[1]["laps"] is None
    assert cars[1]["why"] == {"strengths": ["acceleration"], "saves_tyres": False}


def test_build_week_matching_and_non_bop():
    races = [_race(track="Autódromo de Interlagos", category="Gr.4"), _race(track="Nowhere Ring"),
             _race(kind="one-make", category="Specified Car", car="X2014"), _race(kind="tbd", week="next", category="")]
    week = build_week(races, TRACKS, INDEX, "2026-10-16")
    this, nxt = week["weeks"][0]["races"], week["weeks"][1]["races"]
    assert [c["id"] for c in this[0]["cars"]] == ["genesis"]
    assert this[1]["cars"] == []
    assert this[2]["cars"] == [] and this[2]["group"] is None and this[2]["car"] == "X2014"
    assert len(nxt) == 1 and nxt[0]["group"] is None


def test_saves_tyres_needs_high_wear():
    race = build_week([_race(tyre_wear="x2")], TRACKS, INDEX, "d")["weeks"][0]["races"][0]
    assert race["cars"][0]["why"]["saves_tyres"] is False


def test_update_week_keeps_old_file_on_failure(tmp_path):
    old = tmp_path / "week.json"
    old.write_text('{"old": true}', encoding="utf-8")
    def boom(url):
        raise OSError("offline")
    assert update_week(tmp_path, fetch=boom, log=lambda *a: None) is False
    assert old.read_text(encoding="utf-8") == '{"old": true}'


def test_update_week_writes_file(tmp_path):
    import json
    (tmp_path / "tracks.json").write_text(json.dumps(TRACKS), encoding="utf-8")
    (tmp_path / "index.json").write_text(json.dumps(INDEX), encoding="utf-8")
    assert update_week(tmp_path, fetch=lambda url: FIXTURE, log=lambda *a: None, ranking=NO_LIVE) is True
    data = json.loads((tmp_path / "week.json").read_text(encoding="utf-8"))
    assert [len(w["races"]) for w in data["weeks"]] == [3, 3]
    spa = data["weeks"][0]["races"][1]
    assert spa["group"] == "gr3" and spa["cars"][0]["id"] == "f-type"


def test_update_week_rejects_partial_markup_change(tmp_path):
    import json
    import re
    (tmp_path / "tracks.json").write_text(json.dumps(TRACKS), encoding="utf-8")
    (tmp_path / "index.json").write_text(json.dumps(INDEX), encoding="utf-8")
    old = tmp_path / "week.json"
    old.write_text('{"old": true}', encoding="utf-8")
    assert update_week(tmp_path, fetch=lambda url: FIXTURE, log=lambda *a: None, ranking=NO_LIVE) is True  # sanity: intact page works
    old.write_text('{"old": true}', encoding="utf-8")
    broken = re.sub(r'class="daily-category[^"]*">[^<]+<', "<", FIXTURE)  # class labels vanish
    assert update_week(tmp_path, fetch=lambda url: broken, log=lambda *a: None, ranking=NO_LIVE) is False
    assert old.read_text(encoding="utf-8") == '{"old": true}'
    no_tracks = re.sub(r'<h2 title="[^"]+"', "<h2", FIXTURE)
    assert update_week(tmp_path, fetch=lambda url: no_tracks, log=lambda *a: None, ranking=NO_LIVE) is False


NO_LIVE = lambda url, depth: ([], {})
NAMES = {"#CAR1": "Genesis Genesis Gr.3", "#CAR2": "Jaguar F-type Gr.3", "#CAR3": "Unknown Car Gr.3"}


def _rows(spec):
    """spec: [(car code, laps, base ms)] -> fake top-of-board rows (fastest first)."""
    rows = [{"ranking_stats": {"car_code": code}, "score": ms + i, "update_time": "2026-10-13T10:00:00"}
            for code, n, ms in spec for i in range(n)]
    return sorted(rows, key=lambda r: r["score"])


def test_build_week_prefers_live_pace():
    live = {"B": (_rows([(1, 150, 137000), (2, 100, 137500), (3, 50, 136000)]), NAMES)}
    race = build_week([_race()], TRACKS, INDEX, "d", live)["weeks"][0]["races"][0]
    # Genesis is the faster known car this week even though the history ranks the F-type first; unknown cars are dropped
    assert [c["id"] for c in race["cars"]] == ["genesis", "f-type"]
    g = race["cars"][0]
    assert (g["source"], g["laps"], g["share"], g["tier"], g["name"]) == ("live", 150, 50, "A", "Genesis Gr.3")
    assert g["why"] == {"strengths": ["acceleration"], "saves_tyres": False}


def test_build_week_live_works_without_track_history():
    live = {"B": (_rows([(1, 250, 137000)]), NAMES)}
    race = build_week([_race(track="Nowhere Ring")], TRACKS, INDEX, "d", live)["weeks"][0]["races"][0]
    assert [(c["id"], c["source"], c["tier"]) for c in race["cars"]] == [("genesis", "live", None)]


def test_build_week_thin_or_missing_live_falls_back_to_history():
    thin = {"B": (_rows([(1, 60, 137000)]), NAMES)}
    for live in (thin, {}, {"C": (_rows([(1, 300, 137000)]), NAMES)}):
        race = build_week([_race()], TRACKS, INDEX, "d", live)["weeks"][0]["races"][0]
        assert [c["source"] for c in race["cars"]] == ["real", "estimate", "estimate"]
        assert "share" not in race["cars"][0]


def test_build_week_live_ignored_for_next_week():
    live = {"B": (_rows([(1, 300, 137000)]), NAMES)}
    race = build_week([_race(week="next")], TRACKS, INDEX, "d", live)["weeks"][1]["races"][0]
    assert race["cars"][0]["source"] == "real"


def test_live_rankings_reads_only_running_boards_and_skips_failures():
    calls = []
    def ranking(url, depth):
        assert depth == 100
        calls.append(url)
        if "1014979" in url or len(calls) == 2:
            raise OSError("timeout")
        return ["rows"], {"#CAR1": "x"}
    logs = []
    out = live_rankings(FIXTURE, ranking, log=logs.append)
    assert out == {"B": (["rows"], {"#CAR1": "x"})}
    assert len(calls) == 2 and any("race C" in m for m in logs)


def test_update_week_uses_live_data(tmp_path):
    import json
    (tmp_path / "tracks.json").write_text(json.dumps(TRACKS), encoding="utf-8")
    (tmp_path / "index.json").write_text(json.dumps(INDEX), encoding="utf-8")
    rows = _rows([(2, 120, 137000), (1, 120, 137200)])
    assert update_week(tmp_path, fetch=lambda url: FIXTURE, log=lambda *a: None, ranking=lambda url, depth: (rows, NAMES)) is True
    spa = json.loads((tmp_path / "week.json").read_text(encoding="utf-8"))["weeks"][0]["races"][1]
    assert [(c["id"], c["source"], c["share"]) for c in spa["cars"]] == [("f-type", "live", 50), ("genesis", "live", 50)]


def test_running_boards_never_enter_history(tmp_path, monkeypatch):
    from gt7bop import leaderboards
    monkeypatch.setattr(leaderboards, "_get", lambda url: FIXTURE)
    monkeypatch.setattr(leaderboards, "time", type("T", (), {"sleep": staticmethod(lambda s: None)}))
    monkeypatch.setattr(leaderboards, "fetch_ranking", lambda url: (_ for _ in ()).throw(AssertionError("fetched " + url)))
    assert leaderboards.update(tmp_path, pages=1, log=lambda *a: None) == 0
    assert list(tmp_path.iterdir()) == []


def test_fetch_ranking_stops_at_depth(monkeypatch):
    import json

    from gt7bop import leaderboards
    page = json.dumps({"board": [{"score": i} for i in range(200)], "has_more": True})
    monkeypatch.setattr(leaderboards, "_get", lambda url: page if "page_data" in url else "const carNames = {};")
    monkeypatch.setattr(leaderboards, "time", type("T", (), {"sleep": staticmethod(lambda s: None)}))
    assert len(leaderboards.fetch_ranking("/daily/leaderboard/?event=x", 100)[0]) == 100


def test_build_week_live_race_has_balance():
    live = {"B": (_rows([(1, 50, 137000), (2, 50, 137500)]) * 2, NAMES)}
    race = build_week([_race()], TRACKS, INDEX, "d", live)["weeks"][0]["races"][0]
    assert race["balance"] == 2.0
    assert "balance" not in build_week([_race()], TRACKS, INDEX, "d", {})["weeks"][0]["races"][0]
