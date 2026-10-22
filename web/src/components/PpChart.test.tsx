import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { histories } from "../test/fixtures";
import { PpChart } from "./PpChart";

const series = [
  { id: "155-2-5-v6-ti-93", name: "155 2.5 V6 TI '93", points: histories["155-2-5-v6-ti-93"]! },
  { id: "963-24", name: "963 '24", points: histories["963-24"]! },
];

it("draws one path per car", () => {
  const { container } = render(<PpChart series={series} />);
  expect(container.querySelectorAll("path[data-car]")).toHaveLength(2);
});

it("has an accessible label naming the cars", () => {
  render(<PpChart series={series} />);
  expect(screen.getByRole("img", { name: "PP by version for 155 2.5 V6 TI '93, 963 '24" })).toBeInTheDocument();
});

it("marks each point so a single-point series is visible", () => {
  const { container } = render(<PpChart series={[{ id: "x", name: "X", points: histories["963-24"]!.slice(0, 1) }]} />);
  expect(container.querySelectorAll("circle[data-car='x']")).toHaveLength(1);
});
