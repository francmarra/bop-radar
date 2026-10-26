import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { I18N } from "../../site/js/i18n.js";

const src = readFileSync(new URL("../../site/index.html", import.meta.url), "utf8");
const nav = src.match(/<nav class="tabs"[\s\S]*?<\/nav>/)?.[0] ?? "";

test("main nav: week, ranking, updates as links, then a search button", () => {
  const at = (s) => nav.indexOf(s);
  assert.ok(at('href="week/"') >= 0);
  assert.ok(at('href="week/"') < at('href="ranking/"'));
  assert.ok(at('href="ranking/"') < at('href="updates/"'));
  assert.ok(at('href="updates/"') < at('id="search-open"'));
  assert.ok(!/data-page="help"/.test(nav) && !/data-page="home"/.test(nav));
});

test("help moves to the footer", () => {
  assert.match(src.match(/<footer>[\s\S]*?<\/footer>/)[0], /href="help\/"/);
});

test("search dialog and settings popover exist", () => {
  assert.match(src, /<dialog id="search-dlg"/);
  assert.match(src, /id="q"[^>]*role="combobox"/);
  assert.match(src, /popovertarget="settings"/);
  assert.match(src, /<div id="settings" popover/);
});

test("new nav strings exist in EN and PT", () => {
  for (const k of ["nav_search", "nav_bop", "settings", "close"]) assert.ok(I18N.en[k] && I18N.pt[k], k);
});

test("footer help link carries the attribute main.js uses to make it absolute", () => {
  assert.match(src.match(/<footer>[\s\S]*?<\/footer>/)[0], /<a href="help\/" data-t="nav_help">/);
  assert.ok(readFileSync(new URL("../../site/js/main.js", import.meta.url), "utf8").includes('footer a[data-t=\\"nav_help\\"]'));
});
test("search button: placeholder is hidden from the accessible name; viewport covers notches", () => {
  assert.match(src, /<span class="ph" aria-hidden="true"/);
  assert.match(src, /viewport-fit=cover/);
});
