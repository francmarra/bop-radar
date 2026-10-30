import test from "node:test";
import assert from "node:assert/strict";

globalThis.document = { getElementById: () => null };
const { t, setLang } = await import("../../site/js/i18n.js");
const { store } = await import("../../site/js/data.js");
const { specSheet, techSheet, heroPic, measuredLines } = await import("../../site/js/pages/car.js");

test("specSheet shows the four headline values", () => {
  const s = String(specSheet({ power_ps: 476, weight_kg: 1260, ps_per_t: 377.8, pp: 687.78, balance: "52:48" }, t));
  for (const x of ["476", "377.8", "687.78"]) assert.ok(s.includes(x), x);
  assert.ok(s.includes("1260") || s.includes("1,260"));
  assert.equal(s.match(/<dt/g).length, 4);
  assert.ok(!s.includes(t("balance")));
});

test("techSheet shows balance and handling", () => {
  const s = String(techSheet({ balance: "47:53" }, { low: "N", high: "N" }, t));
  assert.ok(s.includes("47:53") && s.includes(`${t("neutral")} / ${t("neutral")}`));
});

test("specSheet renders missing values as a dash", () => {
  const s = String(specSheet({ power_ps: 476 }, t));
  assert.ok(s.includes("—"));
  assert.ok(!/undefined|NaN/.test(s));
});

test("heroPic adds a hidden reflection only for real pictures", () => {
  store.images = {};
  const sil = String(heroPic("zz"));
  assert.equal(sil.match(/car-sil/g).length, 1);
  assert.ok(!sil.includes("reflection"));
  store.images = { a: [1280, 720] };
  const pic = String(heroPic("a"));
  assert.ok(pic.includes('class="reflection" aria-hidden="true"'));
  assert.equal(pic.match(/<img/g).length, 2);
});

test("vtext is decorative: hidden from screen readers", async () => {
  const { vtext } = await import("../../site/js/format.js");
  const v = String(vtext("グループ3", "バランス"));
  assert.ok(v.startsWith('<span class="vtext" aria-hidden="true">グループ3'));
  assert.ok(v.includes("<span>バランス</span>"));
  assert.ok(!String(vtext("デイリーレース")).includes("<span>"));
});

const SPA = { track: "spa", compound: "RS", fuel_pct_per_lap: 2.7, grip_loss_pct_per_lap: 0.4, laps: 8, sessions: 1, date: "2026-11-02" };

test("measuredLines writes the measured fuel and grip (EN)", () => {
  setLang("en");
  const s = String(measuredLines([SPA], t, "en", { spa: "Spa" }));
  assert.ok(s.includes("Measured · Spa, RS, x1: fuel 2.7 %/lap · grip −0.4 %/lap (8 laps)"), s);
});

test("measuredLines writes the measured fuel and grip (PT, decimal comma)", () => {
  setLang("pt");
  const s = String(measuredLines([SPA], t, "pt", { spa: "Spa" }));
  setLang("en");
  assert.ok(s.includes("Medido · Spa, RS, x1: consumo 2,7 %/volta · aderência −0,4 %/volta (8 voltas)"), s);
});

test("measuredLines leaves grip out when it is null, and capitalises unknown track ids", () => {
  const s = String(measuredLines([{ ...SPA, grip_loss_pct_per_lap: null, laps: 1 }], t, "en"));
  assert.ok(s.includes("Spa, RS, x1: fuel 2.7 %/lap (1 lap)"), s);
  assert.ok(!s.includes("grip"));
});

test("measuredLines is empty without measurements", () => {
  assert.equal(String(measuredLines(undefined, t, "en")), "");
  assert.equal(String(measuredLines([], t, "en")), "");
});

test("measuredLines escapes the track", () => {
  const s = String(measuredLines([{ ...SPA, track: "<b>x</b>" }], t, "en"));
  assert.ok(s.includes("&lt;b&gt;") && !s.includes("<b>x"));
});
