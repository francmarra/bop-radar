import type { HistoryPointDto } from "../api/client";

export function buildSeries(series: { id: string; points: HistoryPointDto[] }[]) {
  const dates = new Map<string, string>();
  for (const s of series) for (const p of s.points) dates.set(p.version, p.date);
  const versions = [...dates.keys()].sort((a, b) => dates.get(a)!.localeCompare(dates.get(b)!) || a.localeCompare(b));
  const lines = series.map((s) => {
    const byVersion = new Map(s.points.map((p) => [p.version, p.pp]));
    return { id: s.id, values: versions.map((v) => byVersion.get(v) ?? null) };
  });
  return { versions, lines };
}

export function toPath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let pen = false;
  return values
    .map((v, i) => {
      if (v === null) {
        pen = false;
        return "";
      }
      const cmd = `${pen ? "L" : "M"}${x(i)} ${y(v)}`;
      pen = true;
      return cmd;
    })
    .filter(Boolean)
    .join(" ");
}

/** Indices of X labels: first, every `step`, and always the last; at most 8. */
export function labelIndices(n: number): number[] {
  const step = Math.ceil(n / 8);
  const last = n - 1;
  return Array.from({ length: n }, (_, i) => i).filter((i) => i === last || (i % step === 0 && last - i >= step));
}
