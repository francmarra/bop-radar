import test from "node:test";
import assert from "node:assert/strict";

const { store, getImages } = await import("../../site/js/data.js");
const { carImg } = await import("../../site/js/carimg.js");

test("carImg renders sized lazy image", () => {
  store.images = { a: [320, 180] };
  const l = carImg("a", "l", "A");
  assert.match(l, /width="320" height="180"/);
  assert.match(l, /loading="lazy"/);
  assert.match(l, /alt="A"/);
  assert.match(l, /img\/cars\/a-l\.webp/);
  const s = carImg("a", "s");
  assert.match(s, /width="160" height="90"/);
  assert.match(s, /alt=""/);
});

test("carImg falls back to silhouette", () => {
  store.images = {};
  const h = carImg("zz", "l", "x");
  assert.ok(h.includes("car-sil") && h.includes('aria-hidden="true"'));
  assert.ok(!h.includes("<img"));
});

test("carImg escapes alt", () => {
  store.images = { a: [320, 180] };
  assert.ok(carImg("a", "l", '<b>"x"').includes("&lt;b&gt;&quot;x&quot;"));
});

test("getImages falls back to empty", async () => {
  store.images = null;
  const orig = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error("net"));
  try {
    assert.deepEqual(await getImages(), {});
  } finally {
    globalThis.fetch = orig;
  }
});
