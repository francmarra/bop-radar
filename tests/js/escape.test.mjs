import test from "node:test";
import assert from "node:assert/strict";

globalThis.document = { getElementById: () => null };
const { t } = await import("../../site/js/i18n.js");
const { verdictHtml, esc } = await import("../../site/js/format.js");
const { tierBadge, setBadge, traits } = await import("../../site/js/ui.js");
const evil = `x"><img src=x onerror=alert(1)>`;

test("scraped enum values cannot inject HTML", () => {
  for (const html of [verdictHtml(evil, t), tierBadge(evil), setBadge(evil), traits({ strengths: [], tyre_wear: evil, fuel_use: evil })]) {
    assert.ok(!html.includes("<img"), html);
    assert.ok(!/class="[^"]*"[^>]*onerror/.test(html), html);
  }
});

const { html, raw } = await import("../../site/js/format.js");
test("html`` escapes values, keeps nested Html, joins arrays, drops null but not false", () => {
  assert.equal(String(html`<b title="${evil}">${evil}</b>`), `<b title="${esc(evil)}">${esc(evil)}</b>`);
  assert.equal(String(html`<ul>${["a<", "b"].map((x) => html`<li>${x}</li>`)}</ul>`), "<ul><li>a&lt;</li><li>b</li></ul>");
  assert.equal(String(html`${raw("<i>ok</i>")}${null}${undefined}${0}`), "<i>ok</i>0");
  assert.equal(String(html`<b aria-pressed="${false}">`), `<b aria-pressed="false">`);
  assert.equal(String(html`${"<b>" + html`<i></i>`}`), "&lt;b&gt;&lt;i&gt;&lt;/i&gt;"); // concatenation drops the mark: fails safe
  assert.ok(html`x` instanceof String && html`x`.includes("x"));
});

const { carLink } = await import("../../site/js/week.js");
test("car names from scraped pages cannot inject HTML", () => {
  const index = { groups: [{ cars: [{ id: "x", name: evil }] }] };
  for (const h of [carLink(index, { id: "x", name: evil }), carLink(index, evil + "?")]) assert.ok(!h.includes("<img"), String(h));
});

import { readdirSync, readFileSync } from "node:fs";
test("every HTML template goes through html`` (plain template literals skip escaping)", () => {
  const dir = new URL("../../site/js/", import.meta.url);
  const files = [...readdirSync(dir).map((f) => [dir, f]), ...readdirSync(new URL("pages/", dir)).map((f) => [new URL("pages/", dir), f])];
  for (const [d, f] of files.filter(([, f]) => f.endsWith(".js"))) {
    const src = readFileSync(new URL(f, d), "utf8");
    assert.doesNotMatch(src, /innerHTML\s*=\s*`|(return|=>|[?:(,])\s*`\s*</, f);
  }
});
