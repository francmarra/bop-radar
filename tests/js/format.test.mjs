import test from "node:test";
import assert from "node:assert/strict";
import { esc, num, fold } from "../../site/js/format.js";

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
