import test from "node:test";
import assert from "node:assert/strict";

globalThis.document = { getElementById: () => null };
const { t } = await import("../../site/js/i18n.js");
const { store } = await import("../../site/js/data.js");
const { specSheet, heroPic } = await import("../../site/js/pages/car.js");

test("specSheet shows the six medium-track values", () => {
  const s = String(specSheet({ power_ps: 476, weight_kg: 1260, ps_per_t: 377.8, pp: 687.78, balance: "52:48" }, { low: "N", high: "O" }, t));
  for (const x of ["476", "377.8", "687.78", "52:48", t("neutral"), t("oversteer")]) assert.ok(s.includes(x), x);
  assert.ok(s.includes("1260") || s.includes("1,260"));
  assert.equal(s.match(/<dt/g).length, 6);
});

test("specSheet renders missing values as a dash", () => {
  const s = String(specSheet({ power_ps: 476 }, {}, t));
  assert.ok(s.includes("—"));
  assert.ok(!/undefined|NaN/.test(s));
});

test("heroPic adds a hidden reflection only for real pictures", () => {
  store.images = {};
  const sil = String(heroPic("zz"));
  assert.equal(sil.match(/car-sil/g).length, 1);
  assert.ok(!sil.includes("reflection"));
  store.images = { a: [1280, 720] };
  const pic = String(heroPic("a"));
  assert.ok(pic.includes('class="reflection" aria-hidden="true"'));
  assert.equal(pic.match(/<img/g).length, 2);
});
