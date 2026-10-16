import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../../site/style.css", import.meta.url), "utf8");
const block = (selector) => {
  const i = css.indexOf(selector + " {");
  assert.ok(i >= 0, `missing block ${selector}`);
  const body = css.slice(i, css.indexOf("}", i));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const dark = block(":root");
const light = { ...dark, ...block(':root[data-theme="light"]') };
for (const [name, theme] of [["dark", dark], ["light", light]]) {
  for (const fg of ["text", "muted", "buff", "nerf", "mixed", "accent-text"]) {
    for (const bg of ["bg", "panel", "panel-2"]) {
      test(`${name}: --${fg} on --${bg} >= 4.5`, () => {
        assert.ok(ratio(theme[fg], theme[bg]) >= 4.5, `${theme[fg]} on ${theme[bg]} = ${ratio(theme[fg], theme[bg]).toFixed(2)}`);
      });
    }
  }
}

test("no font size below 15px / .8333rem", () => {
  for (const m of css.matchAll(/font(?:-size)?:[^;}]*?(\d*\.?\d+)(px|rem)/g)) {
    const px = m[2] === "px" ? +m[1] : +m[1] * 18;
    assert.ok(px >= 15 - 0.01, `too small: ${m[0]}`);
  }
});
