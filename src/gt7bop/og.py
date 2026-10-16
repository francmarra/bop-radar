"""1200×630 share images (Open Graph) for the site, every BoP update and every car. Needs Pillow."""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG, PANEL, TEXT, MUTED, ACCENT = (13, 15, 18), (21, 25, 30), (238, 241, 244), (169, 178, 189), (225, 6, 0)
TIER = {"S": (245, 197, 24), "A": (77, 163, 255), "B": (154, 165, 177), "C": (93, 102, 112)}
FONTS = {
    True: ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "C:/Windows/Fonts/arialbd.ttf", "/Library/Fonts/Arial Bold.ttf"],
    False: ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "C:/Windows/Fonts/arial.ttf", "/Library/Fonts/Arial.ttf"],
}
SET_NAMES = {"h": "fast", "m": "medium", "l": "slow"}
VERDICT = {"buff": "Faster", "nerf": "Slower", "mixed": "Mixed"}


def load_font(size: int, bold: bool = False, candidates: list[str] | None = None):
    for path in candidates if candidates is not None else FONTS[bold]:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def _fit(draw, text: str, max_w: int, size: int, bold: bool = True):
    """Largest font (down to 60 % of size) that fits; ellipsis if even that is too wide."""
    for s in range(size, int(size * 0.6) - 1, -4):
        font = load_font(s, bold)
        if draw.textlength(text, font=font) <= max_w:
            return text, font
    while len(text) > 3 and draw.textlength(text + "…", font=font) > max_w:
        text = text[:-1]
    return text + "…", font


def _card(title: str, lines: list[tuple[str, tuple]], badge: tuple[str, tuple] | None = None, corner: str = "") -> Image.Image:
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((40, 40, W - 40, H - 40), radius=28, fill=PANEL)
    d.rectangle((40, 40, 56, H - 40), fill=ACCENT)
    d.text((96, 78), "GT7 BoP Radar", font=load_font(34, True), fill=ACCENT)
    if corner:
        d.text((W - 96, 78), corner, font=load_font(34), fill=MUTED, anchor="ra")
    x = 96
    if badge:
        letter, colour = badge
        d.rounded_rectangle((96, 150, 196, 250), radius=18, fill=colour)
        d.text((146, 200), letter, font=load_font(72, True), fill=(17, 17, 17), anchor="mm")
        x = 226
    text, font = _fit(d, title, W - 96 - x, 76)
    d.text((x, 200), text, font=font, fill=TEXT, anchor="lm")
    y = 290
    for line, colour in lines[:4]:
        text, font = _fit(d, line, W - 192, 38, bold=False)
        d.text((96, y), text, font=font, fill=colour)
        y += 56
    d.text((96, H - 92), "francmarra.github.io/bop-radar", font=load_font(26), fill=MUTED)
    return im


def _counts(c: dict) -> str:
    return " · ".join(f"{c[k]} {w}" for k, w in (("buff", "faster"), ("nerf", "slower"), ("mixed", "mixed")) if c.get(k)) or "no changes"


def make_images(site: Path, out: Path) -> set[str]:
    """Write og/<name>.png; returns the names written (default, update-<v>, car-<id>)."""
    out.mkdir(parents=True, exist_ok=True)
    data = site / "data"
    index = json.loads((data / "index.json").read_text(encoding="utf-8"))
    labels = {g["id"]: g["label"] for g in index["groups"]}
    cards = {"default": _card("Every BoP change, explained", [
        ("Gran Turismo 7 · Gr.1 to Gr.4", MUTED), ("Best cars by real Daily Race pace", TEXT), ("This week's Daily Races guide", TEXT)])}
    for u in index["updates"]:
        cards[f"update-{u['version']}"] = _card(f"BoP update {u['version']}", [
            (f"{labels.get(g, g)}: {_counts(c)}", TEXT) for g, c in u["counts"].items()], corner=u["date"])
    for g in index["groups"]:
        for c in g["cars"]:
            path = data / "cars" / f"{c['id']}.json"
            if not path.exists():
                continue
            car = json.loads(path.read_text(encoding="utf-8"))
            best = c.get("best_set", "m")
            now = (car.get("now") or {}).get(best) or c["sets"][best]
            src = "real Daily Race pace" if now.get("source") == "real" else "estimate"
            last = next((h for h in reversed(car["history"]) if h.get("changed") and h.get("verdict")), None)
            lines = [(f"{g['label']} · {car['maker']}", MUTED),
                     (f"#{now['rank']} of {len(g['cars'])} on {SET_NAMES[best]} tracks · {src}", TEXT)]
            if last:
                lines.append((f"Last BoP change {last['v']}: {VERDICT.get(last['verdict'], last['verdict'])}", TEXT))
            cards[f"car-{c['id']}"] = _card(car["name"], lines, (now["tier"], TIER.get(now["tier"], TIER["B"])))
    for name, im in cards.items():
        im.save(out / f"{name}.png", optimize=True)
    return set(cards)
