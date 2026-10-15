"""Parse GT ENG!NE car-spec pages into Old -> New BoP comparisons."""

import re
from dataclasses import dataclass, field
from html.parser import HTMLParser

# normalised header (no whitespace / hyphens) -> metric key
METRICS = {
    "PP": "pp",
    "Max.Pwr.[PS]": "power_ps",
    "Max.Trq.[kgfm]": "torque_kgfm",
    "Wt.[kg]": "weight_kg",
    "Pwr.toWt.Ratio[PS/t]": "ps_per_t",
    "Fr/RrWt.Balance": "balance",
    "Acc.0400m[sec]": "acc_400",
    "Acc.01000m[sec]": "acc_1000",
    "Acc.100150km/h[sec]": "acc_100_150",
    "StabilityLowSpeed": "stab_low",
    "StabilityHighSpeed": "stab_high",
    "Rot.G60km/h": "rotg_60",
    "Rot.G120km/h": "rotg_120",
    "Rot.G240km/h": "rotg_240",
}
VERSION_RE = re.compile(r"(\d+\.\d+)[^(]*\((\d{4}-\d{2}-\d{2})\)")
TABLE_RE = re.compile(r"^spec_updates_\d*([hml])$")
ARCHIVE_RE = re.compile(r'href="(gr\d-02-archives-\d+\.html)"')


@dataclass
class CarRow:
    maker: str
    drivetrain: str
    old: dict
    new: dict


@dataclass
class Comparison:
    old_version: str
    old_date: str
    new_version: str
    new_date: str
    note: str = ""
    sets: dict[str, dict[str, CarRow]] = field(default_factory=dict)


def _norm(text: str) -> str:
    return re.sub(r"[\s\-]", "", text)


def _value(text: str):
    t = text.replace(",", "").strip()
    if t == "-":  # car not in the list on this side (newly added / removed)
        return None
    try:
        return float(t) if "." in t else int(t)
    except ValueError:
        return t or None


BALANCE_RE = re.compile(r"^\d{1,2}:\d{1,2}$")


def _metric(key: str, text: str):
    """Numbers only (balance must look like '44:56'); anything else from the source becomes None."""
    v = _value(text)
    if key == "balance":
        return v if isinstance(v, str) and BALANCE_RE.match(v) else None
    return v if isinstance(v, (int, float)) else None


class _Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.comps: list[Comparison] = []
        self.in_h6 = False
        self.h6_text: list[str] = []
        self.in_script = False
        self.table_set: str | None = None  # BoP set of the spec_updates table being read
        self.rows: list[list[tuple[str, int]]] = []
        self.row: list[tuple[str, int]] | None = None
        self.cell: list[str] | None = None
        self.colspan = 1
        self.note_open = False
        self.common_text = ""  # e.g. "(High / Mid-speed BoPs are common)" before a table

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "h6":
            self.in_h6, self.h6_text, self.common_text = True, [], ""
        elif tag == "script":
            self.in_script = True
        elif tag == "table":
            m = TABLE_RE.match(a.get("id") or "")
            self.table_set = m.group(1) if m and self.comps else None
            self.rows = []
            self.note_open = False
        elif self.table_set and tag == "tr":
            self._close_cell()
            self.row = []
            self.rows.append(self.row)
        elif self.table_set and tag in ("td", "th") and self.row is not None:
            self._close_cell()  # source HTML sometimes leaves <th> unclosed
            self.cell, self.colspan = [], int(a.get("colspan") or 1)

    def handle_endtag(self, tag):
        if tag == "h6":
            self.in_h6 = False
            found = VERSION_RE.findall(" ".join(self.h6_text))
            if len(found) == 2:
                (ov, od), (nv, nd) = found
                self.comps.append(Comparison(ov, od, nv, nd))
                self.note_open = True
        elif tag == "script":
            self.in_script = False
        elif tag in ("td", "th"):
            self._close_cell()
        elif tag == "table" and self.table_set:
            self._close_cell()
            cars = _rows_to_cars(self.rows)
            sets = self.comps[-1].sets
            sets[self.table_set] = cars
            for s in _common_sets(self.common_text) - {self.table_set}:
                sets.setdefault(s, cars)
            self.common_text = ""
            self.table_set = None

    def handle_data(self, data):
        if self.in_h6:
            self.h6_text.append(data)
        elif self.cell is not None:
            self.cell.append(data)
        elif "common" in data and not self.in_script:
            self.common_text = data
        elif self.note_open and not self.in_script and data.strip() and not self.comps[-1].note:
            self.comps[-1].note = data.strip()[:160]

    def _close_cell(self):
        if self.cell is not None and self.row is not None:
            self.row.append(("".join(self.cell).strip(), self.colspan))
        self.cell = None


def _common_sets(text: str) -> set[str]:
    """Sets that share the next table's values, from GT ENG!NE's '(... are common)' remark."""
    if "common" not in text or "not common" in text:
        return set()
    return {s for s, word in (("h", "High"), ("m", "Mid"), ("l", "Low")) if word in text}


def _rows_to_cars(rows: list[list[tuple[str, int]]]) -> dict[str, CarRow]:
    header = next((r for r in rows if any(_norm(t) == "PP" for t, _ in r)), None)
    if header is None:
        return {}
    # header row: one entry per data column, remembering where each metric group starts
    columns: list[tuple[str, int, int]] = []  # (normalised name, start column, width)
    pos = 0
    for text, span in header:
        columns.append((_norm(text), pos, span))
        pos += span
    car_cols = [c for c in columns if c[0] == "Car"]
    maker_col = next(c for c in columns if c[0] == "Manufacturer")
    drive_col = next((c for c in columns if c[0] == "Pt.Lyt."), None)
    name_col = car_cols[-1]  # the trailing "Car" column holds the full name
    seen: set[str] = set()
    metric_cols = []
    for name, start, span in columns:
        key = METRICS.get(name)
        if key and key not in seen and span in (3, 5):
            seen.add(key)
            metric_cols.append((key, start, span))

    cars: dict[str, CarRow] = {}
    for row in rows:
        cells = [t for t, _ in row]
        if len(cells) < pos or not cells[0].isdigit():  # data rows start with the row number
            continue
        old, new = {}, {}
        for key, start, span in metric_cols:
            old[key] = _metric(key, cells[start])
            new[key] = _metric(key, cells[start + (2 if span == 5 else 1)])
            if span == 5:  # stability: value + N/U/O flag (neutral / understeer / oversteer)
                old[key + "_flag"] = cells[start + 1] if cells[start + 1] in ("N", "U", "O") else None
                new[key + "_flag"] = cells[start + 3] if cells[start + 3] in ("N", "U", "O") else None
        if cells[maker_col[1]] in ("", "-") or cells[name_col[1]].startswith("("):
            continue  # summary rows such as "(Average)"
        cars[cells[name_col[1]]] = CarRow(
            maker=cells[maker_col[1]],
            drivetrain=cells[drive_col[1]] if drive_col else "",
            old=old,
            new=new,
        )
    return cars


def parse_page(html: str) -> list[Comparison]:
    p = _Parser()
    p.feed(html)
    return p.comps


def archive_links(html: str) -> list[str]:
    return sorted(set(ARCHIVE_RE.findall(html)))
