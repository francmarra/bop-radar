from gt7bop.carimages import match_ids, normalise, read_mapping, update_mapping

CSV = "ID,ShortName,Maker\n2160,Genesis Gr.3,16\n1,Twin,1\n2,Twin,2\n"
CARS = [{"id": "genesis-gr-3", "name": "Genesis Gr.3"}, {"id": "twin", "name": "Twin"}, {"id": "x", "name": "Nope"}]


def test_normalise():
    assert normalise("Lancer Evolution Final Gr.3") == "lancerevolutionfinalgr3"
    assert normalise("Citroën GT '08") == "citroengt08"


def test_match_exact_and_ambiguous():
    assert match_ids(CARS, CSV) == ({"genesis-gr-3": 2160}, ["x"], ["twin"])


def test_update_idempotent(tmp_path):
    p = tmp_path / "car_images.toml"
    p.write_text('# manual\n"x" = 99\n', encoding="utf-8")
    update_mapping(p, CARS, CSV)
    first, mapping = p.read_bytes(), read_mapping(p)
    update_mapping(p, CARS, CSV)
    assert p.read_bytes() == first
    assert read_mapping(p) == mapping == {"genesis-gr-3": 2160, "x": 99}


def test_update_keeps_manual(tmp_path):
    p = tmp_path / "car_images.toml"
    p.write_text('# header\n"old" = 5\n# manual\n"x" = 99\n', encoding="utf-8")
    assert update_mapping(p, CARS, CSV) == ([], ["twin"])
    assert read_mapping(p) == {"genesis-gr-3": 2160, "x": 99}
    assert p.read_text(encoding="utf-8").endswith('# manual\n"x" = 99\n')
