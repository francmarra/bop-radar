"""gt7bop update [--refresh] — fetch, parse, assess and write site/data."""

import argparse
from pathlib import Path

from gt7bop.assess import assess_group
from gt7bop.build import build_group
from gt7bop.export import export
from gt7bop.fetch import GROUPS, fetch_group
from gt7bop.parse import parse_page

ROOT = Path(__file__).resolve().parents[2]


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="gt7bop")
    sub = ap.add_subparsers(dest="cmd", required=True)
    up = sub.add_parser("update", help="fetch GT ENG!NE pages and rebuild site/data")
    up.add_argument("--refresh", action="store_true", help="re-download the live (non-archive) pages")
    up.add_argument("--offline", action="store_true", help="use only cached pages")
    args = ap.parse_args(argv)

    cache = ROOT / "cache"
    histories, assessments = [], {}
    for group in GROUPS:
        paths = sorted(cache.glob(f"{group}-*.html")) if args.offline else fetch_group(group, cache, args.refresh)
        comps = [c for p in paths for c in parse_page(p.read_text(encoding="utf-8"))]
        hist = build_group(group, comps)
        histories.append(hist)
        assessments[group] = assess_group(hist)
        print(f"{group}: {len(hist.cars)} cars, {len(hist.versions)} versions (latest {hist.versions[-1][0]})")
    export(histories, assessments, ROOT / "site" / "data", ROOT / "data" / "notes")
    print("wrote site/data")


if __name__ == "__main__":
    main()
