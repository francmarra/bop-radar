import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import App from "./App";
import { renderWithClient } from "./test/render";

it("renders the title and the empty state", () => {
  renderWithClient(<App />);
  expect(screen.getByRole("heading", { name: "BoP Radar — Compare" })).toBeInTheDocument();
  expect(screen.getByText("Pick 2 to 4 cars to compare")).toBeInTheDocument();
});
