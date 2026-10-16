/* Shared HTML pieces that depend on the current language. */
import { t, I18N, lang } from "./i18n.js";
import { esc, signed, verdictHtml, levelName } from "./format.js";
export const app = document.getElementById("app");
export const verdict = (v) => verdictHtml(v, t);
export const tierBadge = (x) => `<span class="tier ${x}" title="${esc(levelName(x, t))}" aria-label="${esc(levelName(x, t))}">${x}</span>`;
export const setBadge = (s) => `<span class="set ${s}" title="${t("set_" + s + "_long")}">${t("set_" + s)}</span>`;
export const deltaText = (d = {}) => ([signed(d.power_ps, " PS"), signed(d.weight_kg, " kg", true)].filter(Boolean).join(" ") || `<span class="muted">${t("pp_only")}</span>`) + (d.set ? ` <span class="muted">(${t("bop_of", t("set_" + d.set))})</span>` : "");
export const level = (l) => `<span class="lvl ${l}">${t(l)}</span>`;
export const rowLinks = (root) => root.querySelectorAll("[data-href]").forEach((el) => (el.onclick = () => (location.hash = el.dataset.href)));
export const traits = (b) => b ? `<div class="chips">${b.strengths.map((s) => `<span>${esc(I18N[lang].tr[s])}</span>`).join("")}<span class="soft">🛞 ${t(b.tyre_wear)}</span><span class="soft">⛽ ${t(b.fuel_use)}</span></div>` : "";
