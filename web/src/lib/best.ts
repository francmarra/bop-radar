export type Metric = "rank" | "pp" | "powerPs" | "torqueKgfm" | "weightKg" | "psPerT";

export const METRIC_DIRECTION: Record<Metric, "max" | "min"> = {
  rank: "min",
  pp: "max",
  powerPs: "max",
  torqueKgfm: "max",
  weightKg: "min",
  psPerT: "max",
};

/** Indexes of the best value(s); null/undefined are ignored, ties are all best. */
export function bestIndexes(
  values: (number | null | undefined)[],
  direction: "max" | "min",
): Set<number> {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return new Set();
  const target = direction === "max" ? Math.max(...present) : Math.min(...present);
  return new Set(values.flatMap((v, i) => (v === target ? [i] : [])));
}
