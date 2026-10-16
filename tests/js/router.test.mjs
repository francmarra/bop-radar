import test from "node:test";
import assert from "node:assert/strict";
import { basePath, pathOf, hashToPath, link, shouldIntercept } from "../../site/js/router.js";

test("base comes from the module location", () => {
  assert.equal(basePath("https://francmarra.github.io/bop-radar/js/router.js"), "/bop-radar/");
  assert.equal(basePath("http://127.0.0.1:8000/js/router.js"), "/");
});
test("path segments under the base", () => {
  assert.deepEqual(pathOf("/bop-radar/car/genesis-gr-3/", "/bop-radar/"), ["car", "genesis-gr-3"]);
  assert.deepEqual(pathOf("/bop-radar/", "/bop-radar/"), []);
  assert.deepEqual(pathOf("/bop-radar/update/1.71/", "/bop-radar/"), ["update", "1.71"]);
  assert.deepEqual(pathOf("/car/citro%C3%ABn/", "/"), ["car", "citroën"]);
});
test("old hash links map to paths", () => {
  assert.equal(hashToPath("#/car/genesis-gr-3"), "car/genesis-gr-3/");
  assert.equal(hashToPath("#/update/1.71"), "update/1.71/");
  assert.equal(hashToPath("#/"), "");
  assert.equal(hashToPath("#app"), null);
  assert.equal(hashToPath(""), null);
});
test("links are absolute under the base", () => {
  assert.equal(link("car/x/", "/bop-radar/"), "/bop-radar/car/x/");
  assert.equal(link("", "/"), "/");
});
const ev = (o = {}) => ({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...o });
const a = (href, attrs = {}) => ({ href, target: attrs.target || "", hasAttribute: (k) => k in attrs });
test("only plain clicks on internal page links are intercepted", () => {
  const o = "https://francmarra.github.io", b = "/bop-radar/", here = "/bop-radar/";
  assert.equal(shouldIntercept(ev(), a(o + "/bop-radar/car/x/"), o, b, here), true);
  for (const e of [ev({ ctrlKey: true }), ev({ metaKey: true }), ev({ shiftKey: true }), ev({ button: 1 }), ev({ defaultPrevented: true })])
    assert.equal(shouldIntercept(e, a(o + "/bop-radar/car/x/"), o, b, here), false);
  assert.equal(shouldIntercept(ev(), a(o + "/bop-radar/car/x/", { target: "_blank" }), o, b, here), false);
  assert.equal(shouldIntercept(ev(), a(o + "/bop-radar/car/x/", { download: "" }), o, b, here), false);
  assert.equal(shouldIntercept(ev(), a("https://gt-engine.com/gt7/"), o, b, here), false);
  assert.equal(shouldIntercept(ev(), a(o + "/other-project/"), o, b, here), false);
  assert.equal(shouldIntercept(ev(), a(o + "/bop-radar/data/index.json"), o, b, here), false);
  assert.equal(shouldIntercept(ev(), a(o + "/bop-radar/#app"), o, b, here), false);
});

import { rootPath } from "../../site/js/router.js";
test("header hrefs normalise to root-relative paths from any page, including 404.html", () => {
  assert.equal(rootPath("./", "/bop-radar/"), "");
  assert.equal(rootPath("week/", "/bop-radar/"), "week/");
  assert.equal(rootPath("../../week/", "/bop-radar/"), "week/");
  assert.equal(rootPath("/bop-radar/week/", "/bop-radar/"), "week/");
  assert.equal(rootPath("/week/", "/"), "week/");
  assert.equal(rootPath("/bop-radar/", "/bop-radar/"), "");
});
test("malformed percent-encoding does not throw", () => {
  assert.deepEqual(pathOf("/bop-radar/car/100%/", "/bop-radar/"), ["car", "100%"]);
});
