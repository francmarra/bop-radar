/* Shared HTML pieces that depend on the current language. */
import { t, I18N, lang } from "./i18n.js";
import { esc, signed, verdictHtml, levelName } from "./format.js";
export const app = document.getElementById("app");
export const verdict = (v) => verdictHtml(v, t);
const TIERS = ["S", "A", "B", "C"], SETS = ["h", "m", "l"], LEVELS = ["low", "medium", "high"];
export const tierBadge = (x) => (TIERS.includes(x) ? `<span class="tier ${x}" title="${esc(levelName(x, t))}" aria-label="${esc(levelName(x, t))}">${x}</span>` : "");
export const setBadge = (s) => (SETS.includes(s) ? `<span class="set ${s}" title="${esc(t("set_" + s + "_long"))}">${esc(t("set_" + s))}</span>` : "");
export const deltaText = (d = {}) => ([signed(d.power_ps, " PS"), signed(d.weight_kg, " kg", true)].filter(Boolean).join(" ") || `<span class="muted">${t("pp_only")}</span>`) + (d.set ? ` <span class="muted">(${t("bop_of", t("set_" + d.set))})</span>` : "");
export const level = (l) => (LEVELS.includes(l) ? `<span class="lvl ${l}">${esc(t(l))}</span>` : "");
export const traits = (b) => b ? `<div class="chips">${b.strengths.map((s) => `<span>${esc(I18N[lang].tr[s])}</span>`).join("")}<span class="soft">🛞 ${esc(t(b.tyre_wear))}</span><span class="soft">⛽ ${esc(t(b.fuel_use))}</span></div>` : "";
export const fmtDate = (d) => {
  try { return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", { dateStyle: "medium" }).format(new Date(d)); } catch { return d; }
};
