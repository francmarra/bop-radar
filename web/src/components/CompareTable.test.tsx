import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { compare155vs963 } from "../test/fixtures";
import { CompareTable } from "./CompareTable";

const cellsOf = (row: string) => {
  const tr = screen.getByRole("row", { name: new RegExp(`^${row}`) });
  return within(tr).getAllByRole("cell");
};

it("marks the best PP", () => {
  render(<CompareTable data={compare155vs963} />);
  const [first, second] = cellsOf("PP");
  expect(first).not.toHaveTextContent("best");
  expect(second).toHaveTextContent("best");
});

it("marks the lowest weight as best", () => {
  render(<CompareTable data={compare155vs963} />);
  const [first, second] = cellsOf("Weight");
  expect(first).not.toHaveTextContent("best");
  expect(second).toHaveTextContent("best");
});

it("shows a dash for a missing PS/t and does not mark it", () => {
  render(<CompareTable data={compare155vs963} />);
  const [first, second] = cellsOf("PS/t");
  expect(second).toHaveTextContent("—");
  expect(second).not.toHaveTextContent("best");
  expect(first).toHaveTextContent("best");
});

it("has a caption with version and set", () => {
  render(<CompareTable data={compare155vs963} />);
  expect(screen.getByRole("table", { name: "Version 1.71 · set M" })).toBeInTheDocument();
});
