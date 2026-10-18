"""Build `dist/`: the static site plus one pre-rendered page per URL, a sitemap and share images.

Search engines and link previews get a real URL, title, description and readable content for every car,
update and the weekly guide; the SPA takes over on boot and renders the same page in the visitor's language."""

import hashlib
import json
import re
import shutil
from html import escape
from pathlib import Path
from urllib.parse import urlparse

SITE_URL = "https://francmarra.github.io/bop-radar/"
NAME = "GT7 BoP Radar"
SET_NAMES = {"h": "fast", "m": "medium", "l": "slow"}
VERDICT = {"buff": "Faster", "nerf": "Slower", "mixed": "Mixed"}
HOME_DESC = ("Gran Turismo 7 Balance of Performance history, per-car context and the best Gr.1–Gr.4 cars, "
             "ranked by real Daily Race pace.")


def e(text) -> str:
    return escape(str(text if text is not None else ""), quote=True)


def _delta(d: dict) -> str:
    bits = [f"{d['power_ps']:+g} PS" if d.get("power_ps") else "", f"{d['weight_kg']:+g} kg" if d.get("weight_kg") else ""]
    return ", ".join(b for b in bits if b)


def _counts_sentence(counts: dict) -> str:
    parts = [f"{counts[k]} {w}" for k, w in (("buff", "faster"), ("nerf", "slower"), ("mixed", "mixed")) if counts.get(k)]
    return ", ".join(parts) or "no changes"


def _jsonld(obj: dict) -> str:
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace("<", "\\u003c") + "</script>"


def _crumbs(site_url: str, items: list[tuple[str, str]]) -> str:
    return _jsonld({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i, "name": name, "item": site_url + path} for i, (name, path) in enumerate(items, 1)]})


HEAD_DROP = re.compile(r'\s*<(?:meta (?:name="description"|property="og:[^"]+"|name="twitter:[^"]+")|link rel="canonical")[^>]*>')
REL_ATTR = re.compile(r'\b(href|src)="(?!https?:|#|/|data:|mailto:)([^"]*)"')


def page_html(shell: str, prefix: str, meta: dict, body: str) -> str:
    """prefix: how to reach the site root from this page ("", "../", "../../" or an absolute "/bop-radar/")."""
    html = HEAD_DROP.sub("", shell)
    html = REL_ATTR.sub(lambda m: f'{m[1]}="{(prefix + ("" if m[2] in ("./", ".") else m[2])) or "./"}"', html)
    head = [f'<meta name="description" content="{e(meta["description"])}">']
    if meta.get("noindex"):
        head.append('<meta name="robots" content="noindex">')
    else:
        head += [f'<link rel="canonical" href="{e(meta["url"])}">', '<meta property="og:type" content="website">',
                 f'<meta property="og:site_name" content="{NAME}">', f'<meta property="og:title" content="{e(meta["title"])}">',
                 f'<meta property="og:description" content="{e(meta["description"])}">', f'<meta property="og:url" content="{e(meta["url"])}">',
                 f'<meta property="og:image" content="{e(meta["image"])}">', '<meta property="og:image:width" content="1200">',
                 '<meta property="og:image:height" content="630">', '<meta name="twitter:card" content="summary_large_image">']
    head += meta.get("jsonld", [])
    html = re.sub(r"<title>.*?</title>", lambda _: f"<title>{e(meta['title'])}</title>", html, count=1)
    html = html.replace("</head>", "  " + "\n  ".join(head) + "\n</head>", 1)
    return re.sub(r'(<main id="app"[^>]*>).*?(</main>)', lambda m: m[1] + body + m[2], html, count=1, flags=re.DOTALL)


def _hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def versioned_shell(shell: str, site: Path, root: str) -> str:
    """Cache-bust assets by content: GitHub Pages caches files for 10 minutes, and a visitor who mixes cached and
    freshly deployed modules gets a broken site. The import map pins every module, including those reached through
    relative imports, to its hash; the entry script and the stylesheet carry the hash in their own URL."""
    modules = sorted(f.relative_to(site).as_posix() for f in (site / "js").rglob("*.js"))
    imports = {root + m: f"{root}{m}?v={_hash(site / m)}" for m in modules}
    shell = re.sub(r'\b(href|src)="([\w/.-]+\.(?:css|js))"',
                   lambda m: f'{m[1]}="{m[2]}?v={_hash(site / m[2])}"' if (site / m[2]).is_file() else m[0], shell)
    return shell.replace("</head>", f'  <script type="importmap">{json.dumps({"imports": imports})}</script>\n</head>', 1)


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def build_pages(site: Path, site_url: str, image) -> list[dict]:
    """Each page: {path, title, description, body (html, links relative to the site root), jsonld, lastmod}."""
    data = site / "data"
    index = _load(data / "index.json")
    labels = {g["id"]: g["label"] for g in index["groups"]}
    gen = index["generated"]
    latest = index["updates"][0] if index["updates"] else None
    pages = []

    top = "".join(
        f'<h3>{e(g["label"])}</h3><ol>' + "".join(f'<li><a href="car/{e(c["id"])}/">{e(c["name"])}</a> ({e(c["maker"])})</li>'
                                                for c in sorted(g["cars"], key=lambda c: c["sets"]["m"]["rank"])[:10]) + "</ol>"
        for g in index["groups"])
    latest_html = ""
    if latest:
        latest_html = (f'<h2>Latest BoP: version {e(latest["version"])} ({e(latest["date"])})</h2><ul>'
                       + "".join(f"<li>{e(labels.get(g, g))}: {e(_counts_sentence(c))}</li>" for g, c in latest["counts"].items())
                       + f'</ul><p><a href="update/{e(latest["version"])}/">See all changes</a></p>')
    pages.append({"path": "", "title": f"{NAME} — best Gr.1–4 cars and every BoP change", "description": HOME_DESC,
                  "body": f"<h1>How did BoP change your car?</h1><p>BoP (Balance of Performance) is the power and weight adjustment "
                          f"Polyphony makes to keep race cars even.</p>{latest_html}<h2>Cars by class (medium-speed tracks)</h2>{top}",
                  "jsonld": [_jsonld({"@context": "https://schema.org", "@type": "WebSite", "name": NAME, "url": site_url})],
                  "lastmod": gen, "image": image("default")})

    pages.append({"path": "updates/", "title": f"Every GT7 BoP update — {NAME}",
                  "description": "Every Gran Turismo 7 Balance of Performance update since 1.15 for Gr.1–Gr.4 cars, explained.",
                  "body": "<h1>BoP updates</h1><ul>" + "".join(
                      f'<li><a href="update/{e(u["version"])}/">Version {e(u["version"])}</a> ({e(u["date"])}): '
                      + e("; ".join(f"{labels.get(g, g)} {_counts_sentence(c)}" for g, c in u["counts"].items())) + "</li>"
                      for u in index["updates"]) + "</ul>", "jsonld": [], "lastmod": latest["date"] if latest else gen,
                  "image": image("default")})

    for u in index["updates"]:
        detail = _load(data / "updates" / f"{u['version']}.json") or {"groups": {}}
        body = f'<h1>BoP update {e(u["version"])}</h1><p>Released {e(u["date"])}.</p>'
        for g, cars in detail["groups"].items():
            body += f"<h2>{e(labels.get(g, g))}</h2><ul>" + "".join(
                f'<li><a href="car/{e(c["id"])}/">{e(c["name"])}</a>: {e(VERDICT.get(c["verdict"], c["verdict"]))}'
                + (f" ({e(_delta(c.get('delta', {})))})" if _delta(c.get("delta", {})) else "") + "</li>" for c in cars) + "</ul>"
        summary = "; ".join(f"{labels.get(g, g)}: {_counts_sentence(c)}" for g, c in u["counts"].items())
        path = f"update/{u['version']}/"
        pages.append({"path": path, "title": f"GT7 BoP update {u['version']} — what changed — {NAME}",
                      "description": f"Gran Turismo 7 BoP update {u['version']} ({u['date']}): {summary}.", "body": body,
                      "jsonld": [_crumbs(site_url, [("BoP updates", "updates/"), (f"Version {u['version']}", path)])],
                      "lastmod": u["date"], "image": image(f"update-{u['version']}")})

    for g in index["groups"]:
        for meta in g["cars"]:
            car = _load(data / "cars" / f"{meta['id']}.json")
            if not car:
                continue
            hist = car["history"]
            now = car.get("now") or {}
            best = meta.get("best_set", "m")
            n = len(g["cars"])
            standing = ""
            if best in now:
                b = now[best]
                src = f"real Daily Race pace on {b.get('tracks', 0)} tracks" if b.get("source") == "real" else "estimate"
                standing = (f"<p>Level {e(b['tier'])}: #{e(b['rank'])} of {n} in {e(g['label'])} on {SET_NAMES[best]} tracks ({e(src)}).</p>")
            changes = [h for h in hist if h.get("changed") and h.get("verdict")]
            items = "".join(f"<li>{e(h['v'])} ({e(h['date'])}): {e(VERDICT.get(h['verdict'], h['verdict']))}"
                            + (f" — {e(_delta(h.get('delta') or {}))}" if _delta(h.get("delta") or {}) else "") + "</li>"
                            for h in reversed(changes))
            path = f"car/{meta['id']}/"
            level = f", level {now[best]['tier']} (#{now[best]['rank']}/{n})" if best in now else ""
            pages.append({
                "path": path, "title": f"{car['name']} BoP history — {NAME}",
                "description": (f"{car['name']} ({g['label']}, {car['maker']}) in Gran Turismo 7: every BoP change since "
                                f"{hist[0]['v']}{level}, best on {SET_NAMES[best]} tracks."),
                "body": (f"<h1>{e(car['name'])}</h1><p>{e(g['label'])} · {e(car['maker'])} · {e(car['drivetrain'])}</p>{standing}"
                         f"<h2>BoP history</h2>" + (f"<ol>{items}</ol>" if items else f"<p>No BoP changes since version {e(hist[0]['v'])}.</p>")),
                "jsonld": [_crumbs(site_url, [(g["label"], ""), (car["name"], path)])],
                "lastmod": hist[-1]["date"], "image": image(f"car-{meta['id']}")})

    week = _load(data / "week.json")
    body = "<h1>This week's Daily Races</h1>"
    for w in (week or {}).get("weeks", []):
        if w["label"] != "this":
            continue
        for r in w["races"]:
            body += f"<h2>Race {e(r['race'])} · {e(r['track'])}</h2><p>{e(labels.get(r.get('group'), r.get('category') or ''))}</p>"
            if r.get("cars"):
                body += "<ol>" + "".join(f'<li><a href="car/{e(c["id"])}/">{e(c["name"])}</a></li>' for c in r["cars"]) + "</ol>"
    pages.append({"path": "week/", "title": f"This week's GT7 Daily Races — best cars — {NAME}",
                  "description": "This week's Gran Turismo 7 Daily Races: tracks, rules and the best cars for each race under the current BoP.",
                  "body": body, "jsonld": [], "lastmod": (week or {}).get("generated", gen), "image": image("default")})
    pages.append({"path": "help/", "title": f"Help and glossary — {NAME}",
                  "description": "How to use GT7 BoP Radar, what BoP, PP, PS/t and levels mean, and where the data comes from.",
                  "body": "<h1>Help</h1><p>Find your car with the search box, read what changed in its BoP history and compare it with "
                          "its class. Levels: S = top 10 %, A = top 35 %, B = top 70 %, C = the rest, based on real Daily Race pace "
                          "when available.</p>", "jsonld": [], "lastmod": gen, "image": image("default")})
    return pages


def render(site: Path, out: Path, site_url: str = SITE_URL, og: bool = True) -> list[str]:
    site_url = site_url.rstrip("/") + "/"
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(site, out)
    root = urlparse(site_url).path
    shell = versioned_shell((site / "index.html").read_text(encoding="utf-8"), site, root)
    images: set[str] = set()
    if og:
        try:
            from gt7bop.og import make_images  # optional dependency (Pillow): `uv run --extra render`
        except ImportError:
            print("render: Pillow not installed, share images skipped (pages use og/default.png)")
        else:
            images = make_images(site, out / "og")

    def image(name: str) -> str:
        return f"{site_url}og/{name if name in images else 'default'}.png"

    pages = build_pages(site, site_url, image)
    for p in pages:
        depth = p["path"].count("/")
        prefix = "../" * depth
        body = re.sub(r'href="(?!https?:|#|/)([^"]*)"', lambda m, prefix=prefix: f'href="{prefix}{m[1]}"', p["body"]) if depth else p["body"]
        html = page_html(shell, prefix, {**p, "url": site_url + p["path"]}, body)
        target = out / p["path"] / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding="utf-8")
    # 404.html is served at any depth: absolute paths
    (out / "404.html").write_text(page_html(shell, root, {"title": f"Page not found — {NAME}", "description": HOME_DESC, "noindex": True},
                                            '<p class="muted">Loading…</p>'), encoding="utf-8")
    urls = "".join(f"  <url><loc>{e(site_url + p['path'])}</loc><lastmod>{e(p['lastmod'])}</lastmod></url>\n" for p in pages)
    (out / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                     f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n', encoding="utf-8")
    (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {site_url}sitemap.xml\n", encoding="utf-8")
    return [p["path"] for p in pages]
