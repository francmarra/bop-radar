import test from "node:test";
import assert from "node:assert/strict";
import { t, setLang } from "../../site/js/i18n.js";
import { mostAffected, classSentence } from "../../site/js/bop.js";

test("mostAffected sorts by absolute PP change", () => {
  const cars = [-1.7, 3.2, 0.5, -4].map((pp, i) => ({ name: "c" + i, delta: { pp } }));
  assert.deepEqual(mostAffected(cars).map((c) => c.delta.pp), [-4, 3.2, -1.7]);
  assert.deepEqual(mostAffected([]), []);
  assert.equal(mostAffected([{ name: "x", delta: {} }]).length, 1);
});
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
