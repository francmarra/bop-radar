import test from "node:test";
import assert from "node:assert/strict";
import { t, setLang, I18N } from "../../site/js/i18n.js";
import { tyreName, rulesText, whyText, summaryText, carLink } from "../../site/js/week.js";

const race = { race: "C", track: "Daytona Road Course", group: "gr3", kind: "bop", tyres: ["RH", "RS"], fuel: "x2", tyre_wear: "x5",
  cars: [{ id: "a", name: "Car A" }, { id: "b", name: "Car B" }, { id: "c", name: "Car C" }, { id: "d", name: "Car D" }] };
const index = { groups: [{ id: "gr3", cars: [{ id: "f-type", name: "F-type Gr.3" }] }] };

test("rules in words (EN)", () => {
  setLang("en");
  assert.equal(rulesText(race, t), "Tyres: Racing Hard and Racing Soft · Fuel ×2 · Tyre wear ×5");
  assert.equal(rulesText({ tyres: ["RM"], fuel: "x1", tyre_wear: "x1" }, t), "Tyres: Racing Medium");
  assert.equal(tyreName("ZZ", t), "ZZ");
});
test("rules in words (PT)", () => {
  setLang("pt");
  assert.equal(rulesText(race, t), "Pneus: Corrida Duros e Corrida Macios · Combustível ×2 · Desgaste ×5");
  setLang("en");
});
test("why text", () => {
  setLang("en");
  assert.equal(whyText({ strengths: ["low-speed cornering"], saves_tyres: true }, t), "low-speed cornering; saves tyres");
  assert.equal(whyText({ strengths: [], saves_tyres: false }, t), "");
});
test("copy summary", () => {
  setLang("en");
  assert.equal(summaryText(race, "https://x/#/week", t), "GT7 Daily Race C · Daytona Road Course · Gr.3 → best: Car A, Car B, Car C — bop-radar: https://x/#/week");
  assert.equal(summaryText({ race: "A", track: "Red Bull Ring", group: null, kind: "one-make", cars: [] }, "u", t), "GT7 Daily Race A · Red Bull Ring — bop-radar: u");
});
test("car links only for known cars, always escaped", () => {
  assert.match(carLink(index, { id: "f-type", name: "F-type Gr.3" }), /^<a href="[^"]*\/car\/f-type\/">F-type Gr.3<\/a>$/);
  assert.match(carLink(index, "F-type Gr.3"), /<a href="[^"]*\/car\/f-type\/">/);
  assert.equal(carLink(index, "Red Bull X2014 <b>"), "Red Bull X2014 &lt;b&gt;");
});
test("week strings exist in EN and PT", () => {
  for (const k of ["nav_week", "week_title", "this_week", "next_week", "top5", "best_bet", "see_guide", "src_real", "src_est", "one_make", "other_race", "tbd_race", "next_empty", "no_track_data", "copy", "copied", "saves_tyres", "help_fuel_x", "help_wear_x", "term_fuel_x", "term_wear_x", "week_strip"])
    for (const l of ["en", "pt"]) assert.ok(I18N[l][k], `${l}.${k}`);
});

import { isStale } from "../../site/js/week.js";
test("guide older than a week is stale", () => {
  assert.equal(isStale("2026-10-01", new Date("2026-10-16")), true);
  assert.equal(isStale("2026-10-12", new Date("2026-10-16")), false);
  assert.equal(isStale("garbage", new Date("2026-10-16")), true);
});
