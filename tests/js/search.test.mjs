import test from "node:test";
import assert from "node:assert/strict";
import { searchCars } from "../../site/js/search.js";

const ix = { groups: [
  { id: "gr1", label: "Gr.1", cars: [{ id: "gr010", name: "GR010", maker: "Toyota" }] },
  { id: "gr3", label: "Gr.3", cars: [
    { id: "296-gt3-23", name: "296 GT3 '23", maker: "Ferrari" },
    { id: "citroen-gt", name: "Citroën GT by Citroën Race Car (Gr.3)", maker: "Citroën" },
  ] },
] };

test("case and accent insensitive", () => {
  assert.deepEqual(searchCars(ix, "CITRO").map((c) => c.id), ["citroen-gt"]);
  assert.deepEqual(searchCars(ix, "citroën").map((c) => c.id), ["citroen-gt"]);
});
test("all words must match; class matches without the dot", () => {
  assert.deepEqual(searchCars(ix, "gr3 ferrari").map((c) => c.id), ["296-gt3-23"]);
});
test("result shape", () => {
  assert.deepEqual(searchCars(ix, "toyota")[0], { id: "gr010", name: "GR010", maker: "Toyota", group: "gr1", label: "Gr.1" });
});
test("no match and empty query give no results", () => {
  assert.deepEqual(searchCars(ix, "zzz"), []);
  assert.deepEqual(searchCars(ix, "   "), []);
});
test("name-prefix matches come first", () => {
  assert.equal(searchCars(ix, "gr")[0].id, "gr010");
});
