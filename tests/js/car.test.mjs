import test from "node:test";
import assert from "node:assert/strict";

globalThis.document = { getElementById: () => null };
const { t } = await import("../../site/js/i18n.js");
const { store } = await import("../../site/js/data.js");
const { specSheet, techSheet, heroPic } = await import("../../site/js/pages/car.js");

test("specSheet shows the four headline values", () => {
  const s = String(specSheet({ power_ps: 476, weight_kg: 1260, ps_per_t: 377.8, pp: 687.78, balance: "52:48" }, t));
  for (const x of ["476", "377.8", "687.78"]) assert.ok(s.includes(x), x);
  assert.ok(s.includes("1260") || s.includes("1,260"));
  assert.equal(s.match(/<dt/g).length, 4);
  assert.ok(!s.includes(t("balance")));
});

test("techSheet shows balance and handling", () => {
  const s = String(techSheet({ balance: "47:53" }, { low: "N", high: "N" }, t));
  assert.ok(s.includes("47:53") && s.includes(`${t("neutral")} / ${t("neutral")}`));
});

test("specSheet renders missing values as a dash", () => {
  const s = String(specSheet({ power_ps: 476 }, t));
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

test("vtext is decorative: hidden from screen readers", async () => {
  const { vtext } = await import("../../site/js/format.js");
  const v = String(vtext("グループ3", "バランス"));
  assert.ok(v.startsWith('<span class="vtext" aria-hidden="true">グループ3'));
  assert.ok(v.includes("<span>バランス</span>"));
  assert.ok(!String(vtext("デイリーレース")).includes("<span>"));
});
