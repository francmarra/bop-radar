import { describe, expect, it } from "vitest";
import { bestIndexes, METRIC_DIRECTION } from "./best";

describe("bestIndexes", () => {
  it("max direction picks the highest", () => {
    expect(bestIndexes([700, 712.5, 690], "max")).toEqual(new Set([1]));
  });
  it("min direction picks the lowest", () => {
    expect(bestIndexes([1200, 1185], "min")).toEqual(new Set([1]));
  });
  it("ties are all best", () => {
    expect(bestIndexes([3, 3, 5], "min")).toEqual(new Set([0, 1]));
  });
  it("ignores nulls", () => {
    expect(bestIndexes([null, 200, 210], "max")).toEqual(new Set([2]));
    expect(bestIndexes([null, null], "max").size).toBe(0);
  });
});

describe("METRIC_DIRECTION", () => {
  it("matches the spec", () => {
    for (const m of ["pp", "powerPs", "torqueKgfm", "psPerT"] as const)
      expect(METRIC_DIRECTION[m]).toBe("max");
    for (const m of ["weightKg", "rank"] as const) expect(METRIC_DIRECTION[m]).toBe("min");
  });
});
