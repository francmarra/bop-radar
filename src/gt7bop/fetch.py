"""Download GT ENG!NE group pages (specs + archives) into a local cache."""

import time
import urllib.request
from pathlib import Path

from gt7bop.parse import archive_links

BASE = "https://gt-engine.com/gt7/cars"
GROUPS = ("gr1", "gr2", "gr3", "gr4")
USER_AGENT = "gt7-bop/0.1 (+https://github.com/francmarra/gt7-bop)"
DELAY_S = 1.5


def _get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def fetch_group(group: str, cache: Path, refresh: bool = False, log=print) -> list[Path]:
    """Return cached page paths for a group; old numbered archives are only fetched once."""
    cache.mkdir(parents=True, exist_ok=True)
    pages = [f"{group}-01-specs.html", f"{group}-02-archives.html"]
    paths: list[Path] = []
    i = 0
    while i < len(pages):
        name = pages[i]
        path = cache / name
        live = name in (f"{group}-01-specs.html", f"{group}-02-archives.html")
        if not path.exists() or (refresh and live):
            log(f"fetch {name}")
            path.write_text(_get(f"{BASE}/{group}/{name}"), encoding="utf-8")
            time.sleep(DELAY_S)
        paths.append(path)
        if name.endswith("-02-archives.html"):
            pages += [p for p in archive_links(path.read_text(encoding="utf-8")) if p not in pages]
        i += 1
    return paths
