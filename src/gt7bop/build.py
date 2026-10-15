"""Merge parsed comparisons into a per-version BoP state for every car of a group."""

from dataclasses import dataclass, field

from gt7bop.parse import Comparison

SETS = ("h", "m", "l")


def version_key(v: str) -> tuple[int, ...]:
    return tuple(int(p) for p in v.split("."))


@dataclass
class Car:
    name: str
    maker: str
    drivetrain: str
    # version -> set -> metrics (full state at that version, carried forward when unchanged)
    states: dict[str, dict[str, dict]] = field(default_factory=dict)
    changed: set[str] = field(default_factory=set)  # versions where this car's BoP changed


@dataclass
class GroupHistory:
    group: str
    versions: list[tuple[str, str]]  # (version, date), ascending
    notes: dict[str, str]  # version -> source note
    cars: dict[str, Car]


def _fill_sets(sets: dict[str, dict], prev: dict | None = None) -> dict[str, dict]:
    """A set missing from an update kept its previous values; with no history (or before the
    H/M/L split) the mid table applies to every set."""
    base = sets.get("m") or next(iter(sets.values()))
    return {s: sets.get(s) or (prev or {}).get(s) or base for s in SETS}


def build_group(group: str, comparisons: list[Comparison]) -> GroupHistory:
    by_new: dict[str, Comparison] = {}
    dates: dict[str, str] = {}
    for c in comparisons:
        dates[c.old_version] = c.old_date
        dates[c.new_version] = c.new_date
        if c.new_version not in by_new or (c.sets and not by_new[c.new_version].sets):
            by_new[c.new_version] = c
    versions = sorted(dates.items(), key=lambda vd: version_key(vd[0]))

    cars: dict[str, Car] = {}
    previous = ""
    for version, _ in versions:
        comp = by_new.get(version)
        rows_by_set = comp.sets if comp else {}
        names = {n for rows in rows_by_set.values() for n in rows}
        for name in names:
            per_set = {s: r for s, rows in rows_by_set.items() if (r := rows.get(name)) and r.new.get("pp")}
            if not per_set:
                continue
            first = next(iter(per_set.values()))
            car = cars.get(name)
            if car is None:
                car = cars[name] = Car(name, first.maker, first.drivetrain)
                if first.old.get("pp"):  # the "Old" side gives the state just before this version
                    car.states[comp.old_version] = _fill_sets({s: r.old for s, r in per_set.items()})
            prev = _latest(car, version)
            new = _fill_sets({s: r.new for s, r in per_set.items()}, prev)
            if prev is None or _bop(prev) != _bop(new):
                car.changed.add(version)
            car.states[version] = new
        # carry forward when the version changed nothing; a table that omits a car means it left the group
        for car in cars.values():
            if version not in car.states and not names and previous in car.states:
                car.states[version] = car.states[previous]
        previous = version

    notes = {v: c.note for v, c in by_new.items() if c.note}
    return GroupHistory(group, versions, notes, cars)


def _latest(car: Car, before: str) -> dict | None:
    earlier = [v for v in car.states if version_key(v) < version_key(before)]
    return car.states[max(earlier, key=version_key)] if earlier else None


def _bop(state: dict) -> tuple:
    """The values Polyphony actually sets: power and weight per BoP set."""
    return tuple((state[s].get("power_ps"), state[s].get("weight_kg")) for s in SETS)
