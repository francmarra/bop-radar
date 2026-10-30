import json

import pytest

from gt7bop.measured import MeasuredError, load

MAP = {"mercedes-amg-gt3-20": 3531}
ENTRY = {"gt7_id": 3531, "track": "spa", "compound": "RS", "fuel_pct_per_lap": 2.7, "fuel_pct_per_km": 0.39,
         "grip_loss_pct_per_lap": 0.4, "laps": 8, "sessions": 1, "last_date": "2026-11-02", "parser_version": 2}


def _file(tmp_path, entries, schema=1):
    p = tmp_path / "measured.json"
    p.write_text(json.dumps({"schema": schema, "generated": "2026-11-02", "source": "gt7-telemetry",
                             "entries": entries}), encoding="utf-8")
    return p


def test_missing_file_is_empty(tmp_path):
    assert load(tmp_path / "measured.json", MAP) == ({}, [])


def test_empty_entries_is_empty(tmp_path):
    assert load(_file(tmp_path, []), MAP) == ({}, [])


def test_valid_entry_maps_to_car_id(tmp_path):
    cars, warnings = load(_file(tmp_path, [ENTRY]), MAP)
    assert warnings == []
    assert cars == {"mercedes-amg-gt3-20": [{"track": "spa", "compound": "RS", "fuel_pct_per_lap": 2.7,
                                             "grip_loss_pct_per_lap": 0.4, "laps": 8, "sessions": 1,
                                             "date": "2026-11-02"}]}


def test_entries_sorted_by_track(tmp_path):
    cars, _ = load(_file(tmp_path, [{**ENTRY, "track": "suzuka"}, ENTRY]), MAP)
    assert [m["track"] for m in cars["mercedes-amg-gt3-20"]] == ["spa", "suzuka"]


def test_null_grip_is_allowed(tmp_path):
    cars, _ = load(_file(tmp_path, [{**ENTRY, "grip_loss_pct_per_lap": None}]), MAP)
    assert cars["mercedes-amg-gt3-20"][0]["grip_loss_pct_per_lap"] is None


def test_wrong_schema_raises(tmp_path):
    with pytest.raises(MeasuredError, match="measured.json.*schema"):
        load(_file(tmp_path, [], schema=2), MAP)


def test_missing_field_raises_with_index(tmp_path):
    bad = {k: v for k, v in ENTRY.items() if k != "laps"}
    with pytest.raises(MeasuredError, match=r"entries\[0\].*laps"):
        load(_file(tmp_path, [bad]), MAP)


@pytest.mark.parametrize("field,value", [("fuel_pct_per_lap", "2.7"), ("laps", 0), ("sessions", 1.5), ("track", 3)])
def test_bad_values_raise(tmp_path, field, value):
    with pytest.raises(MeasuredError, match=field):
        load(_file(tmp_path, [{**ENTRY, field: value}]), MAP)


def test_unreadable_json_raises(tmp_path):
    p = tmp_path / "measured.json"
    p.write_text("{", encoding="utf-8")
    with pytest.raises(MeasuredError, match="measured.json"):
        load(p, MAP)


def test_unknown_gt7_id_is_a_warning(tmp_path):
    cars, warnings = load(_file(tmp_path, [{**ENTRY, "gt7_id": 1}]), MAP)
    assert cars == {} and len(warnings) == 1 and "1" in warnings[0]
