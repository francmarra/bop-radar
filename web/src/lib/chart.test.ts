import { expect, it } from "vitest";
import { histories } from "../test/fixtures";
import { buildSeries, toPath } from "./chart";

it("orders versions by date and fills gaps with null", () => {
  const { versions, lines } = buildSeries([
    { id: "155", points: histories["155-2-5-v6-ti-93"]! },
    { id: "963", points: histories["963-24"]! },
  ]);
  expect(versions).toEqual(["1.68", "1.69", "1.70", "1.71"]);
  expect(lines[1]!.values).toEqual([null, null, 745.3, 748.9]);
});

it("breaks the line where a car has no point", () => {
  const d = toPath([1, null, 3], (i) => i * 10, (v) => v);
  expect(d.match(/M/g)).toHaveLength(2);
  expect(d).not.toContain("L");
});
