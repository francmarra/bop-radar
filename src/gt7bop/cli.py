"""gt7bop update [--refresh] — fetch, parse, assess and write site/data."""

import argparse
from pathlib import Path

from gt7bop import leaderboards, week
from gt7bop.assess import assess_group
from gt7bop.build import build_group
from gt7bop.evaluate import evaluate
from gt7bop.export import build_combo_input, export
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
    sub.add_parser("evaluate", help="backtest: real-pace vs PP ranking on unseen Daily Races (offline)")
    sub.add_parser("week", help="this/next week's Daily Races joined with track ratings -> site/data/week.json")
    args = ap.parse_args(argv)

    if args.cmd == "week":
        week.update_week(ROOT / "site" / "data")
        return

    if args.cmd == "leaderboards":
        print(f"{leaderboards.update(ROOT / 'data' / 'leaderboards', args.pages)} new events")
        return

    cache = ROOT / "cache"
    offline = args.offline if args.cmd == "update" else True
    histories, assessments = [], {}
    for group in GROUPS:
        paths = sorted(cache.glob(f"{group}-*.html")) if offline else fetch_group(group, cache, args.refresh)
        comps = [c for p in paths for c in parse_page(p.read_text(encoding="utf-8"))]
        hist = build_group(group, comps)
        histories.append(hist)
        assessments[group] = assess_group(hist)
        print(f"{group}: {len(hist.cars)} cars, {len(hist.versions)} versions (latest {hist.versions[-1][0]})")
    events = load_events(ROOT / "data" / "leaderboards")
    if args.cmd == "evaluate":
        res = evaluate(events, build_combo_input(histories, assessments))
        print(f"{res['events']} events · Spearman rho: real-pace ranking {res['rho_pace']:+.3f} · PP ranking {res['rho_pp']:+.3f}")
        return
    export(histories, assessments, ROOT / "site" / "data", ROOT / "data" / "notes", events)
    print(f"{len(events)} leaderboard events")
    print("wrote site/data")


if __name__ == "__main__":
    main()
