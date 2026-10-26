import test from "node:test";
import assert from "node:assert/strict";
import { updateTotals } from "../../site/js/bop.js";
test("updateTotals sums every class", () => {
  assert.deepEqual(updateTotals({ gr3: { buff: 34, nerf: 12, mixed: 3 }, gr4: { buff: 11, nerf: 19 } }), { buff: 45, nerf: 31, mixed: 3 });
  assert.deepEqual(updateTotals(undefined), { buff: 0, nerf: 0, mixed: 0 });
});
