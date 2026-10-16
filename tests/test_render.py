import json
import shutil
from pathlib import Path

from gt7bop.render import render

SITE = Path(__file__).resolve().parents[1] / "site"
URL = "https://example.org/bop-radar/"


def _site(tmp: Path) -> Path:
    s = tmp / "site"
    s.mkdir()
    for f in ("index.html", "style.css", "robots.txt"):
        shutil.copy(SITE / f, s / f)
    shutil.copytree(SITE / "js", s / "js")
    d = s / "data"
    (d / "cars").mkdir(parents=True)
    (d / "updates").mkdir()
    sets = {k: {"rank": 1, "tier": "S", "source": "real", "tracks": 3} for k in "hml"}
    cars = [{"id": "genesis-gr-3", "name": "Genesis Gr.3", "maker": "Hyundai", "drivetrain": "FR", "group": "gr3", "sets": sets, "best_set": "m"},
            {"id": "odd-car", "name": "Odd <Car> \"X\"", "maker": "Maker", "drivetrain": "MR", "group": "gr3",
             "sets": {k: {"rank": 2, "tier": "A", "source": "estimate", "tracks": 0} for k in "hml"}, "best_set": "h"}]
    (d / "index.json").write_text(json.dumps({"generated": "2026-10-16", "groups": [{"id": "gr3", "label": "Gr.3", "cars": cars}],
        "updates": [{"version": "1.71", "date": "2026-08-20", "counts": {"gr3": {"buff": 1, "nerf": 1, "mixed": 0}}}]}), encoding="utf-8")
    for c in cars:
        (d / "cars" / f"{c['id']}.json").write_text(json.dumps({**c, "history": [
            {"v": "1.70", "date": "2026-06-11", "changed": False, "verdict": None, "delta": {}},
            {"v": "1.71", "date": "2026-08-20", "changed": True, "verdict": "buff", "delta": {"power_ps": 6, "weight_kg": -9}}],
            "now": c["sets"]}), encoding="utf-8")
    (d / "updates" / "1.71.json").write_text(json.dumps({"version": "1.71", "date": "2026-08-20", "groups": {"gr3": [
        {"id": "genesis-gr-3", "name": "Genesis Gr.3", "verdict": "buff", "delta": {"power_ps": 6}},
        {"id": "odd-car", "name": "Odd <Car> \"X\"", "verdict": "nerf", "delta": {"weight_kg": 10}}]}}), encoding="utf-8")
    (d / "week.json").write_text(json.dumps({"generated": "2026-10-16", "weeks": [{"label": "this", "races": [
        {"race": "B", "track": "Circuit de Spa-Francorchamps", "group": "gr3", "category": "Gr.3", "kind": "bop", "tyres": ["RM"], "fuel": "x1",
         "tyre_wear": "x1", "cars": [{"id": "genesis-gr-3", "name": "Genesis Gr.3", "tier": "S", "source": "real", "laps": 900}]}]},
        {"label": "next", "races": []}]}), encoding="utf-8")
    return s


def test_pages_meta_and_paths(tmp_path):
    out = tmp_path / "dist"
    pages = render(_site(tmp_path), out, URL, og=False)
    assert set(pages) >= {"", "updates/", "week/", "help/", "update/1.71/", "car/genesis-gr-3/", "car/odd-car/"}
    car = (out / "car" / "genesis-gr-3" / "index.html").read_text(encoding="utf-8")
    assert "<title>Genesis Gr.3 BoP history — GT7 BoP Radar</title>" in car
    assert f'<link rel="canonical" href="{URL}car/genesis-gr-3/">' in car
    assert f'<meta property="og:image" content="{URL}og/default.png">' in car
    assert 'href="../../style.css"' in car and 'src="../../js/main.js"' in car and 'href="../../week/"' in car
    assert "BreadcrumbList" in car and "1.71" in car and "Faster" in car
    assert car.count('<meta name="description"') == 1 and car.count('rel="canonical"') == 1
    home = (out / "index.html").read_text(encoding="utf-8")
    assert 'href="style.css"' in home and '"@type": "WebSite"' in home and 'href="car/genesis-gr-3/"' in home


def test_escaping_week_and_update_content(tmp_path):
    out = tmp_path / "dist"
    render(_site(tmp_path), out, URL, og=False)
    odd = (out / "car" / "odd-car" / "index.html").read_text(encoding="utf-8")
    assert "Odd &lt;Car&gt; &quot;X&quot;" in odd and "<Car>" not in odd
    week = (out / "week" / "index.html").read_text(encoding="utf-8")
    assert "Circuit de Spa-Francorchamps" in week and 'href="../car/genesis-gr-3/"' in week
    upd = (out / "update" / "1.71" / "index.html").read_text(encoding="utf-8")
    assert "Slower" in upd and 'href="../../car/odd-car/"' in upd


def test_sitemap_404_robots(tmp_path):
    out = tmp_path / "dist"
    pages = render(_site(tmp_path), out, URL, og=False)
    sm = (out / "sitemap.xml").read_text(encoding="utf-8")
    assert sm.count("<url>") == len(pages) and f"<loc>{URL}car/odd-car/</loc>" in sm and "<lastmod>2026-08-20</lastmod>" in sm
    nf = (out / "404.html").read_text(encoding="utf-8")
    assert 'href="/bop-radar/style.css"' in nf and 'src="/bop-radar/js/main.js"' in nf and "noindex" in nf
    assert f"Sitemap: {URL}sitemap.xml" in (out / "robots.txt").read_text(encoding="utf-8")
    assert (out / "data" / "index.json").exists()


def test_share_images(tmp_path):
    pytest = __import__("pytest")
    PIL = pytest.importorskip("PIL.Image")
    out = tmp_path / "dist"
    render(_site(tmp_path), out, URL, og=True)
    for name in ("default", "update-1.71", "car-genesis-gr-3", "car-odd-car"):
        with PIL.open(out / "og" / f"{name}.png") as im:
            assert im.size == (1200, 630) and im.format == "PNG"
    car = (out / "car" / "genesis-gr-3" / "index.html").read_text(encoding="utf-8")
    assert f'content="{URL}og/car-genesis-gr-3.png"' in car


def test_font_fallback():
    __import__("pytest").importorskip("PIL")
    from gt7bop.og import load_font
    assert load_font(40, bold=True, candidates=["/nope/missing.ttf"]) is not None
