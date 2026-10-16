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
