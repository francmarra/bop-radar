import json
import re
import shutil
from pathlib import Path

import pytest

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
    assert 'href="../../style.css?v=' in car and 'src="../../js/main.js?v=' in car and 'href="../../week/"' in car
    assert "BreadcrumbList" in car and "1.71" in car and "Faster" in car
    assert car.count('<meta name="description"') == 1 and car.count('rel="canonical"') == 1
    home = (out / "index.html").read_text(encoding="utf-8")
    assert 'href="style.css?v=' in home and '"@type": "WebSite"' in home and 'href="car/genesis-gr-3/"' in home


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
    assert 'href="/bop-radar/style.css?v=' in nf and 'src="/bop-radar/js/main.js?v=' in nf and "noindex" in nf
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


def test_backslash_in_name_does_not_break_build(tmp_path):
    s = _site(tmp_path)
    p = s / "data" / "cars" / "odd-car.json"
    car = json.loads(p.read_text(encoding="utf-8"))
    car["name"] = r"Back\1slash \g<0>"
    p.write_text(json.dumps(car), encoding="utf-8")
    out = tmp_path / "dist"
    render(s, out, URL, og=False)
    assert r"<title>Back\1slash \g&lt;0&gt; BoP history" in (out / "car" / "odd-car" / "index.html").read_text(encoding="utf-8")


def test_default_share_image_ships_with_the_site():
    assert (SITE / "og" / "default.png").exists()


def test_analytics_only_when_configured(tmp_path):
    site = _site(tmp_path)
    render(site, tmp_path / "plain", URL, og=False)
    assert "goatcounter" not in (tmp_path / "plain" / "index.html").read_text(encoding="utf-8")
    out = tmp_path / "dist"
    render(site, out, URL, og=False, goatcounter="bop-radar")
    tag = 'data-goatcounter="https://bop-radar.goatcounter.com/count" async src="https://gc.zgo.at/count.js"'
    for page in (out / "index.html", out / "car" / "genesis-gr-3" / "index.html", out / "404.html"):
        assert page.read_text(encoding="utf-8").count(tag) == 1
    with pytest.raises(ValueError):
        render(site, out, URL, og=False, goatcounter='x" onload="alert(1)')


def _importmap(html: str) -> dict:
    m = re.search(r'<script type="importmap">(.*?)</script>', html, re.DOTALL)
    assert m, "no import map"
    return json.loads(m[1])["imports"]


def test_assets_are_versioned_by_content(tmp_path):
    """A deploy must never mix cached and fresh modules: every module URL carries a hash of its content."""
    site = _site(tmp_path)
    out = tmp_path / "dist"
    render(site, out, URL, og=False)
    home, car = ((out / p / "index.html").read_text(encoding="utf-8") for p in ("", "car/genesis-gr-3"))
    imports = _importmap(home)
    modules = {"/bop-radar/" + f.relative_to(site).as_posix() for f in (site / "js").rglob("*.js")}
    assert set(imports) == modules
    assert all(re.fullmatch(re.escape(k) + r"\?v=[0-9a-f]{10}", v) for k, v in imports.items())
    assert _importmap(car) == imports and _importmap((out / "404.html").read_text(encoding="utf-8")) == imports
    assert home.index('type="importmap"') < home.index('type="module"')  # the map must precede the first module
    v_main = imports["/bop-radar/js/main.js"].split("?v=")[1]
    assert f'src="js/main.js?v={v_main}"' in home and f'src="../../js/main.js?v={v_main}"' in car
    for f, extra in ((site / "js" / "format.js", "\n// changed\n"), (site / "style.css", "\n/* changed */\n")):
        f.write_text(f.read_text(encoding="utf-8") + extra, encoding="utf-8")
    css = re.search(r'href="style.css\?v=(\w+)"', home)[1]
    render(site, out, URL, og=False)
    home2 = (out / "index.html").read_text(encoding="utf-8")
    after = _importmap(home2)
    assert after["/bop-radar/js/format.js"] != imports["/bop-radar/js/format.js"]
    assert after["/bop-radar/js/main.js"] == imports["/bop-radar/js/main.js"]
    assert re.search(r'href="style.css\?v=(\w+)"', home2)[1] != css


def _fake_png(url):
    import io

    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGBA", (960, 540)).save(buf, "PNG")
    return buf.getvalue()


def test_render_without_images(tmp_path):
    out = tmp_path / "dist"
    site = _site(tmp_path)
    render(site, out, URL, og=False)
    assert not (out / "img").exists()
    assert json.loads((out / "data" / "images.json").read_text(encoding="utf-8")) == {}
    assert not [p for p in site.rglob("*") if p.suffix in (".webp", ".png")]
    assert "<img" not in (out / "car" / "genesis-gr-3" / "index.html").read_text(encoding="utf-8").split("<h1>")[1]


def test_render_with_images(tmp_path):
    out = tmp_path / "dist"
    render(_site(tmp_path), out, URL, og=False, car_images={"genesis-gr-3": 2160}, image_cache=tmp_path / "cache", fetch=_fake_png)
    assert (out / "img" / "cars" / "genesis-gr-3-l.webp").exists()
    assert json.loads((out / "data" / "images.json").read_text(encoding="utf-8")) == {"genesis-gr-3": [480, 270]}
    car = (out / "car" / "genesis-gr-3" / "index.html").read_text(encoding="utf-8")
    assert '../../img/cars/genesis-gr-3-l.webp" width="480" height="270"' in car
    assert 'alt="Genesis Gr.3"' in car


def test_unmapped_car_is_logged(tmp_path, capsys):
    render(_site(tmp_path), tmp_path / "dist", URL, og=False, car_images={"genesis-gr-3": 2160}, image_cache=tmp_path / "cache", fetch=_fake_png)
    assert "images: 1 cars unmapped" in capsys.readouterr().out
