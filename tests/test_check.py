import json
import shutil
from datetime import date
from pathlib import Path

from gt7bop.check import check

TODAY = date(2026, 10, 19)


def _data(root: Path, cars_per_group: int = 5, versions=("1.71", "1.70"), tracks: int = 10, events: int = 98,
          generated: str = "2026-10-19") -> Path:
    d = root / "data"
    if d.exists():
        shutil.rmtree(d)
    (d / "cars").mkdir(parents=True)
    (d / "updates").mkdir()
    groups = []
    for g in ("gr1", "gr2", "gr3", "gr4"):
        cars = [{"id": f"{g}-car-{i}", "name": f"Car {i}"} for i in range(cars_per_group)]
        for c in cars:
            (d / "cars" / f"{c['id']}.json").write_text("{}", encoding="utf-8")
        groups.append({"id": g, "label": g, "cars": cars})
    for v in versions:
        (d / "updates" / f"{v}.json").write_text("{}", encoding="utf-8")
    index = {"generated": generated, "groups": groups, "updates": [{"version": v} for v in versions], "events": events}
    (d / "index.json").write_text(json.dumps(index), encoding="utf-8")
    (d / "tracks.json").write_text(json.dumps([{"name": f"T{i}"} for i in range(tracks)]), encoding="utf-8")
    (d / "week.json").write_text(json.dumps({"generated": generated, "weeks": [{"label": "this", "races": [{"track": "Spa"}]}]}),
                                 encoding="utf-8")
    return d


def _baseline(tmp: Path, **kw) -> Path:
    base = tmp / "prev"
    shutil.copytree(_data(tmp / "b", **kw), base)
    return base


def test_healthy_data_passes(tmp_path):
    assert check(_data(tmp_path), _baseline(tmp_path), max_age_days=5, today=TODAY) == ([], [])


def test_broken_or_missing_files_are_errors(tmp_path):
    d = _data(tmp_path)
    (d / "tracks.json").write_text("{not json", encoding="utf-8")
    (d / "cars" / "gr3-car-0.json").unlink()
    (d / "updates" / "1.70.json").unlink()
    errors, _ = check(d)
    assert any("tracks.json" in e for e in errors)
    assert any("gr3-car-0" in e for e in errors) and any("1.70" in e for e in errors)


def test_empty_or_missing_group_is_an_error(tmp_path):
    d = _data(tmp_path)
    index = json.loads((d / "index.json").read_text(encoding="utf-8"))
    index["groups"] = [g for g in index["groups"] if g["id"] != "gr2"]
    index["groups"][0]["cars"] = []
    (d / "index.json").write_text(json.dumps(index), encoding="utf-8")
    errors, _ = check(d)
    assert any("gr2" in e for e in errors) and any("gr1" in e for e in errors)


def test_shrinking_or_regressing_data_is_an_error(tmp_path):
    base = _baseline(tmp_path, cars_per_group=10, versions=("1.72", "1.71"), tracks=40, events=100)
    errors, _ = check(_data(tmp_path, cars_per_group=7, versions=("1.71",), tracks=30, events=90), base)
    text = " ".join(errors)
    assert "gr3" in text and "1.72" in text and "tracks" in text and "events" in text


def test_version_order_is_numeric_not_text(tmp_path):
    errors, _ = check(_data(tmp_path, versions=("1.100", "1.99")), _baseline(tmp_path, versions=("1.99",)))
    assert errors == []


def test_stale_data_is_only_a_warning(tmp_path):
    errors, warnings = check(_data(tmp_path, generated="2026-10-12"), max_age_days=5, today=TODAY)
    assert errors == [] and any("index.json" in w for w in warnings) and any("week.json" in w for w in warnings)
    assert check(_data(tmp_path, generated="2026-10-12"), today=TODAY) == ([], [])  # push builds don't refresh data
