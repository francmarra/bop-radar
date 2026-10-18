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


def _png(w=960, h=540) -> bytes:
    import io

    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGBA", (w, h), (200, 30, 30, 255)).save(buf, "PNG")
    return buf.getvalue()


def _boom(url):
    raise AssertionError("should not download")


def test_build_images_sizes(tmp_path):
    from PIL import Image

    from gt7bop.carimages import build_images
    out, cache = tmp_path / "out", tmp_path / "cache"
    urls = []

    def fetch(url):
        urls.append(url)
        return _png()

    res = build_images({"a": 7}, out, cache, fetch=fetch, log=lambda *a: None, pause=0)
    assert res == {"a": [480, 270]}
    assert urls == ["https://www.gran-turismo.com/common/dist/gt7/carlist/car_thumbnails/car7.png"]
    assert Image.open(out / "a-l.webp").size == (480, 270)
    assert Image.open(out / "a-s.webp").size == (160, 90)
    # cache hit
    assert build_images({"a": 7}, tmp_path / "out2", cache, fetch=_boom, log=lambda *a: None, pause=0) == {"a": [480, 270]}
    # no upscaling
    res = build_images({"b": 8}, out, cache, fetch=lambda u: _png(320, 180), log=lambda *a: None, pause=0)
    assert res == {"b": [320, 180]}


def test_failed_download_falls_back(tmp_path):
    from urllib.error import HTTPError

    from gt7bop.carimages import build_images

    def fetch(url):
        if url.endswith("car2.png"):
            raise HTTPError(url, 404, "nf", None, None)
        return _png()

    res = build_images({"a": 1, "b": 2}, tmp_path / "o", tmp_path / "c", fetch=fetch, log=lambda *a: None, pause=0)
    assert list(res) == ["a"]


def test_corrupt_cache_is_discarded(tmp_path):
    from urllib.error import URLError

    from gt7bop.carimages import build_images
    cache = tmp_path / "c"
    cache.mkdir()
    (cache / "5.png").write_bytes(b"junk")

    def fetch(url):
        raise URLError("down")

    res = build_images({"a": 5}, tmp_path / "o", cache, fetch=fetch, log=lambda *a: None, pause=0)
    assert res == {} and not (cache / "5.png").exists()
