import test from "node:test";
import assert from "node:assert/strict";
import { esc, num, fold, signed, signedNeutral } from "../../site/js/format.js";

test("signedNeutral shows direction without good/bad colour (PP)", () => {
  const up = signedNeutral(12.99), down = signedNeutral(-1.25);
  for (const h of [up, down]) assert.ok(!/\b(up|down)\b/.test(h), h);
  assert.equal(up, '<span class="delta flat rise">+12.99</span>');
  assert.equal(down, '<span class="delta flat fall">-1.25</span>');
  assert.equal(signedNeutral(0), '<span class="delta flat">0</span>');
  assert.equal(signedNeutral(undefined), "");
});

test("signed renders delta chips (up = faster)", () => {
  assert.equal(signed(10, " PS"), '<span class="delta up">+10 PS</span>');
  assert.equal(signed(20, " kg", true), '<span class="delta down">+20 kg</span>');
  assert.equal(signed(-20, " kg", true), '<span class="delta up">-20 kg</span>');
  assert.equal(signed(null), "");
});

test("esc escapes HTML special characters", () => {
  assert.equal(esc(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
});
test("num formats numbers and dashes the rest", () => {
  assert.equal(num(1.234, 2), "1.23");
  assert.equal(num(null), "—");
});
test("fold lowercases and strips accents", () => {
  assert.equal(fold("Citroën GT"), "citroen gt");
});

import { load } from "../../site/js/data.js";
test("load() retries after a failed fetch", async () => {
  let calls = 0;
  globalThis.fetch = async () => (++calls === 1 ? { ok: false } : { ok: true, json: async () => ({ fine: true }) });
  await assert.rejects(load("retry.json"));
  assert.deepEqual(await load("retry.json"), { fine: true });
  assert.equal(calls, 2);
});
