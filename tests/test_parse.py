from pathlib import Path

from gt7bop.parse import archive_links, parse_page

HTML = (Path(__file__).parent / "fixtures" / "mini.html").read_text(encoding="utf-8")


def test_comparisons_and_versions():
    comps = parse_page(HTML)
    assert [(c.old_version, c.new_version) for c in comps] == [("1.70", "1.71"), ("1.69", "1.70")]
    assert comps[0].old_date == "2026-06-11" and comps[0].new_date == "2026-08-20"
    assert comps[1].note == "No changes"


def test_rows_map_metrics_by_header():
    comp = parse_page(HTML)[0]
    rows = comp.sets["h"]
    alfa = rows["4C Gr.3"]
    assert alfa.maker == "Alfa Romeo" and alfa.drivetrain == "MR"
    assert alfa.old["pp"] == 688.80 and alfa.new["pp"] == 681.01
    assert alfa.new["weight_kg"] == 1235  # first Wt. column, not lbs
    assert alfa.new["balance"] == "44:56"
    assert alfa.old["stab_high"] == -0.30 and alfa.new["stab_high"] == -0.38  # 5-wide column
    assert alfa.new["stab_high_flag"] == "N"
    assert alfa.new["rotg_240"] == 1.67
    assert rows["Mercedes-AMG GT3 '16"].new["power_ps"] == 461


def test_set_from_table_id():
    assert sorted(parse_page(HTML)[1].sets) == ["h", "l", "m"]  # "(... are common)" remark
    assert list(parse_page(HTML)[0].sets) == ["h"]


def test_archive_links():
    assert archive_links(HTML) == ["gr3-02-archives-22.html", "gr3-02-archives-23.html"]
