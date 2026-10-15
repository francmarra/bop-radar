from gt7bop.assess import assess_group, percentile, tier
from gt7bop.build import build_group
from gt7bop.parse import CarRow, Comparison


def m(pp, ps, kg):
    return {"pp": pp, "power_ps": ps, "weight_kg": kg, "ps_per_t": round(ps / kg * 1000, 1),
            "torque_kgfm": 40, "rotg_60": 1.2, "rotg_120": 1.3, "rotg_240": 1.6, "acc_100_150": 3.0}


def comps():
    a1 = CarRow("A", "FR", m(680, 450, 1300), m(682, 455, 1300))
    b1 = CarRow("B", "4WD", m(670, 440, 1250), m(670, 440, 1250))
    return [
        Comparison("1.70", "2026-06-11", "1.71", "2026-08-20", sets={"m": {"Car A": a1, "Car B": b1}}),
        Comparison("1.69", "2026-04-23", "1.70", "2026-06-11", note="No changes"),
        Comparison("1.68", "2026-03-12", "1.69", "2026-04-23", sets={"h": {"Car A": CarRow(
            "A", "FR", m(681, 450, 1310), m(680, 450, 1300))}, "m": {"Car A": CarRow(
            "A", "FR", m(681, 450, 1310), m(680, 450, 1300))}}),
    ]


def test_percentile_and_tier():
    assert percentile(3, [1, 2, 3]) == 1.0
    assert percentile(1, [1, 2, 3], higher_better=False) == 1.0
    assert tier(1, 20) == "S" and tier(20, 20) == "C"


def test_history_carries_forward_and_fills_sets():
    hist = build_group("gr3", comps())
    a = hist.cars["Car A"]
    assert [v for v, _ in hist.versions] == ["1.68", "1.69", "1.70", "1.71"]
    assert a.states["1.70"] == a.states["1.69"]  # "No changes" carries the state forward
    assert a.states["1.69"]["l"]["power_ps"] == 450  # first seen: mid table fills missing sets
    assert a.states["1.71"]["l"]["power_ps"] == 450  # set absent from an update keeps its values
    assert a.states["1.71"]["m"]["power_ps"] == 455
    assert a.changed == {"1.69", "1.71"}


def test_verdict_and_summary():
    out = assess_group(build_group("gr3", comps()))
    last = out["Car A"][-1]
    assert last["v"] == "1.71" and last["verdict"] == "buff"
    assert last["delta"]["power_ps"] == 5
    assert last["sets"]["m"]["rank"] == 1
    assert last["summary"].startswith("Buff (+5 PS)")
    assert out["Car A"][-2]["verdict"] == "unchanged"
