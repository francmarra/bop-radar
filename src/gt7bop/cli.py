"""gt7bop update [--refresh] — fetch, parse, assess and write site/data."""

import argparse
from pathlib import Path

from gt7bop import leaderboards
from gt7bop.assess import assess_group
from gt7bop.build import build_group
from gt7bop.export import export
from gt7bop.fetch import GROUPS, fetch_group
from gt7bop.parse import parse_page
from gt7bop.tracks import load_events

ROOT = Path(__file__).resolve().parents[2]


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="gt7bop")
    sub = ap.add_subparsers(dest="cmd", required=True)
    up = sub.add_parser("update", help="fetch GT ENG!NE pages and rebuild site/data")
    up.add_argument("--refresh", action="store_true", help="re-download the live (non-archive) pages")
    up.add_argument("--offline", action="store_true", help="use only cached pages")
    lb = sub.add_parser("leaderboards", help="aggregate Daily Race leaderboards into data/leaderboards")
    lb.add_argument("--pages", type=int, default=2, help="archive pages to scan (2 weeks each)")
    args = ap.parse_args(argv)

    if args.cmd == "leaderboards":
        print(f"{leaderboards.update(ROOT / 'data' / 'leaderboards', args.pages)} new events")
        return

    cache = ROOT / "cache"
    histories, assessments = [], {}
    for group in GROUPS:
        paths = sorted(cache.glob(f"{group}-*.html")) if args.offline else fetch_group(group, cache, args.refresh)
        comps = [c for p in paths for c in parse_page(p.read_text(encoding="utf-8"))]
        hist = build_group(group, comps)
        histories.append(hist)
        assessments[group] = assess_group(hist)
        print(f"{group}: {len(hist.cars)} cars, {len(hist.versions)} versions (latest {hist.versions[-1][0]})")
    events = load_events(ROOT / "data" / "leaderboards")
    export(histories, assessments, ROOT / "site" / "data", ROOT / "data" / "notes", events)
    print(f"{len(events)} leaderboard events")
    print("wrote site/data")


if __name__ == "__main__":
    main()
