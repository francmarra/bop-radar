import test from "node:test";
import assert from "node:assert/strict";
import { t, setLang, I18N } from "../../site/js/i18n.js";
import { sourceBadge } from "../../site/js/format.js";

test("source badge EN/PT", () => {
  setLang("en");
  assert.equal(String(sourceBadge({ source: "real", tracks: 6 }, t)), '<span class="badge lb">Real pace · 6 tracks</span>');
  assert.equal(String(sourceBadge({ source: "estimate", tracks: 1 }, t)), '<span class="badge est">Estimate</span>');
  assert.equal(String(sourceBadge({ source: '"><img>' }, t)), '<span class="badge est">Estimate</span>');
  assert.equal(String(sourceBadge(undefined, t)), "");
  setLang("pt");
  assert.equal(String(sourceBadge({ source: "real", tracks: 1 }, t)), '<span class="badge lb">Ritmo real · 1 pista</span>');
  setLang("en");
});
test("method copy mentions real pace in both languages", () => {
  assert.match(I18N.en.rank_note, /real/i);
  assert.match(I18N.pt.rank_note, /real/i);
  assert.match(I18N.en.help_level, /lap times|pace/i);
  assert.ok(I18N.en.col_pp_rank && I18N.pt.col_pp_rank);
});
