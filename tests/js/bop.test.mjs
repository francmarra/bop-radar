import test from "node:test";
import assert from "node:assert/strict";
import { t, setLang } from "../../site/js/i18n.js";
import { classSentence, updateTotals } from "../../site/js/bop.js";

test("classSentence EN", () => {
  setLang("en");
  assert.equal(classSentence({ buff: 13, nerf: 5, mixed: 2 }, "Gr.3", t), "13 cars got faster, 5 slower, 2 mixed");
  assert.equal(classSentence({ buff: 1, nerf: 0, mixed: 0 }, "Gr.3", t), "1 car got faster");
  assert.equal(classSentence({ buff: 0, nerf: 3, mixed: 1 }, "Gr.3", t), "3 cars got slower, 1 mixed");
  assert.equal(classSentence(undefined, "Gr.1", t), "No changes for Gr.1");
  assert.equal(classSentence({ buff: 0, nerf: 0, mixed: 0 }, "Gr.1", t), "No changes for Gr.1");
});
test("classSentence PT", () => {
  setLang("pt");
  assert.equal(classSentence({ buff: 13, nerf: 5, mixed: 2 }, "Gr.3", t), "13 carros ficaram mais rápidos, 5 mais lentos, 2 mistos");
  assert.equal(classSentence({ buff: 1, nerf: 1, mixed: 1 }, "Gr.3", t), "1 carro ficou mais rápido, 1 mais lento, 1 misto");
  assert.equal(classSentence(undefined, "Gr.3", t), "Sem alterações no Gr.3");
  setLang("en");
});
test("updateTotals sums every class", () => {
  assert.deepEqual(updateTotals({ gr3: { buff: 34, nerf: 12, mixed: 3 }, gr4: { buff: 11, nerf: 19 } }), { buff: 45, nerf: 31, mixed: 3 });
  assert.deepEqual(updateTotals(undefined), { buff: 0, nerf: 0, mixed: 0 });
});
