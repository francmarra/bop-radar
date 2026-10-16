import test from "node:test";
import assert from "node:assert/strict";
import { I18N, t, setLang } from "../../site/js/i18n.js";
import { verdictHtml, levelName } from "../../site/js/format.js";

test("EN and PT have the same keys", () => {
  const en = Object.keys(I18N.en).sort(), pt = Object.keys(I18N.pt).sort();
  assert.deepEqual(en.filter((k) => !pt.includes(k)), []);
  assert.deepEqual(pt.filter((k) => !en.includes(k)), []);
});
test("plain-language terms (EN)", () => {
  setLang("en");
  assert.equal(t("buff"), "Faster");
  assert.equal(t("set_l"), "Slow tracks");
  assert.equal(t("col_tier"), "Level");
  assert.equal(t("col_pp"), "Performance level (PP)");
  assert.equal(t("col_traits"), "Strengths");
  assert.ok(verdictHtml("nerf", t).includes("▼") && verdictHtml("nerf", t).includes("Slower"));
  assert.ok(verdictHtml(null, t).includes("—"));
  assert.equal(levelName("S", t), "S: among the best");
});
test("plain-language terms (PT)", () => {
  setLang("pt");
  assert.equal(t("buff"), "Mais rápido");
  assert.equal(t("nerf"), "Mais lento");
  assert.equal(t("mixed"), "Misto");
  assert.equal(t("set_h"), "Pistas rápidas");
  assert.equal(levelName("C", t), "C: mais fraco");
  setLang("en");
});
