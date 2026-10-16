import test from "node:test";
import assert from "node:assert/strict";

globalThis.document = { getElementById: () => null };
const { t } = await import("../../site/js/i18n.js");
const { verdictHtml } = await import("../../site/js/format.js");
const { tierBadge, setBadge, traits } = await import("../../site/js/ui.js");
const evil = `x"><img src=x onerror=alert(1)>`;

test("scraped enum values cannot inject HTML", () => {
  for (const html of [verdictHtml(evil, t), tierBadge(evil), setBadge(evil), traits({ strengths: [], tyre_wear: evil, fuel_use: evil })]) {
    assert.ok(!html.includes("<img"), html);
    assert.ok(!/class="[^"]*"[^>]*onerror/.test(html), html);
  }
});
