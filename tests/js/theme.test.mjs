import test from "node:test";
import assert from "node:assert/strict";

globalThis.document = { documentElement: { dataset: {} } };
const { initTheme, toggleTheme } = await import("../../site/js/theme.js");
const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };

test("theme works when storage throws", () => {
  assert.equal(initTheme(broken), "system");
  const next = toggleTheme(broken);
  assert.ok(next === "dark" || next === "light");
  assert.equal(document.documentElement.dataset.theme, next);
  assert.notEqual(toggleTheme(broken), next);
});
test("saved theme is applied", () => {
  const mem = { v: "light", getItem() { return this.v; }, setItem(_, v) { this.v = v; } };
  assert.equal(initTheme(mem), "light");
  assert.equal(document.documentElement.dataset.theme, "light");
  assert.equal(toggleTheme(mem), "dark");
  assert.equal(mem.v, "dark");
});
test("theme works when merely reading localStorage throws (blocked site data)", () => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("SecurityError"); } });
  try {
    assert.doesNotThrow(() => initTheme());
    assert.doesNotThrow(() => toggleTheme());
  } finally { delete globalThis.localStorage; }
});
