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
  assert.equal(t("col_verdict"), "Effect");
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

import { info } from "../../site/js/format.js";
const GLOSSARY = ["bop", "pp", "ps_t", "balance", "track_types", "level", "estimates"];
test("every glossary term has help text and a name in EN and PT", () => {
  for (const l of ["en", "pt"]) for (const k of GLOSSARY) {
    assert.ok(I18N[l]["help_" + k]?.length > 10, `${l} help_${k}`);
    assert.ok(I18N[l]["term_" + k]?.length > 1, `${l} term_${k}`);
  }
});
test("info() renders an accessible toggle", () => {
  setLang("en");
  const html = String(info("pp", t));
  assert.match(html, /<button type="button" class="info" aria-expanded="false" aria-controls="tip-pp-\d+"/);
  assert.match(html, /aria-label="More about PP"/);
  assert.match(html, /role="tooltip" id="tip-pp-\d+" class="tip" hidden>Performance Points/);
  assert.notEqual(info("pp", t).match(/id="(tip-pp-\d+)"/)[1], html.match(/id="(tip-pp-\d+)"/)[1]);
});
