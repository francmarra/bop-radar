import test from "node:test";
import assert from "node:assert/strict";
import { t, setLang } from "../../site/js/i18n.js";

globalThis.document ??= { getElementById: () => null };
const { carRow } = await import("../../site/js/row.js");
const { verdictArrow } = await import("../../site/js/format.js");
setLang("en");
const base = { href: "/car/x/", id: "x", name: "N", tier: "A" };

test("carRow escapes the name and sub", () => {
  const out = String(carRow({ ...base, name: "<img src=x>", sub: "<b>m</b>" }));
  assert.ok(out.includes("&lt;img") && !out.includes("<img src=x>"));
  assert.ok(!out.includes("<b>m</b>"));
});
test("carRow marks estimates with an accessible asterisk", () => {
  const on = String(carRow({ ...base, pos: 1, estimate: true }));
  assert.ok(on.includes('<sup class="est"') && on.includes('<span class="sr">Estimate: little race data</span>'));
  assert.ok(!String(carRow({ ...base, pos: 1, estimate: false })).includes('class="est"'));
});
test("carRow without pos has no position cell", () => {
  const out = String(carRow(base));
  assert.ok(!out.includes('class="pos') && out.includes('class="row cr nopos"'));
});
test("carRow keeps a long name on one cell", () => {
  const name = "Z".repeat(60), out = String(carRow(base && { ...base, name }));
  assert.equal(out.split(name).length, 2);
  assert.ok(out.includes(`<span class="nm"><b>${name}`));
});
test("verdictArrow: icon with a spoken label", () => {
  const out = String(verdictArrow("nerf", t));
  assert.ok(out.includes("▼") && out.includes('<span class="sr">Slower</span>'));
  assert.equal(String(verdictArrow("x", t)), '<span class="muted">—</span>');
});
test("carRow without href renders a non-link row", () => {
  const out = String(carRow({ ...base, href: "", pos: 1 }));
  assert.ok(out.startsWith('<div class="row cr"') && !out.includes("<a ") && out.includes("<b>N</b>"));
});
