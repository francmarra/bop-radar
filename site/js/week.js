/* Texts for the Daily Race guide. DOM-free: helpers return plain text, except carLink (escaped HTML). */
import { esc, fold } from "./format.js";
import { BASE } from "./router.js";

const TYRES = ["RH", "RM", "RS", "IM", "W", "CH", "CM", "CS", "SH", "SM", "SS"];
const mult = (s) => parseFloat(String(s ?? "").replace(/[^\d.]/g, "")) || 1;
const groupName = (g) => (/^gr\d$/.test(g ?? "") ? "Gr." + g.slice(2) : "");

export const tyreName = (code, t) => (TYRES.includes(code) ? t("tyre_" + code) : String(code ?? ""));

export function rulesText(race, t) {
  const parts = [];
  if (race.tyres?.length) parts.push(t("rules_tyres", race.tyres.map((c) => tyreName(c, t)).join(` ${t("and")} `)));
  if (mult(race.fuel) !== 1) parts.push(t("rules_fuel", mult(race.fuel)));
  if (mult(race.tyre_wear) !== 1) parts.push(t("rules_wear", mult(race.tyre_wear)));
  return parts.join(" · ");
}

export function whyText(why, t) {
  const tr = t("tr") || {};
  const bits = (why?.strengths ?? []).map((s) => tr[s] ?? s);
  if (why?.saves_tyres) bits.push(t("saves_tyres"));
  return bits.join("; ");
}

export function summaryText(race, url, t) {
  const head = ["GT7 Daily Race " + race.race, race.track, groupName(race.group)].filter(Boolean).join(" · ");
  const best = race.kind === "bop" && race.cars?.length ? ` → ${t("summary_best")}: ${race.cars.slice(0, 3).map((c) => c.name).join(", ")}` : "";
  return `${head}${best} — bop-radar: ${url}`;
}

// car: {id, name} from week.json, or a plain name (one-make races)
export function findCar(index, car) {
  const name = typeof car === "string" ? car : car?.name ?? "";
  const all = index.groups.flatMap((g) => g.cars);
  return all.find((c) => typeof car !== "string" && c.id === car?.id) || all.find((c) => fold(c.name) === fold(name));
}

export function carLink(index, car) {
  const name = typeof car === "string" ? car : car?.name ?? "";
  const hit = findCar(index, car);
  return hit ? `<a href="${BASE}car/${encodeURIComponent(hit.id)}/">${esc(name)}</a>` : esc(name);
}

// the Action runs daily; older than 7 days means scraping has been failing
export function isStale(generated, now = new Date()) {
  const t0 = Date.parse(generated);
  return !Number.isFinite(t0) || now - t0 > 7 * 24 * 3600 * 1000;
}
