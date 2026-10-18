/* Shared HTML pieces that depend on the current language. */
import { t, I18N, lang } from "./i18n.js";
import { html, signed, verdictHtml, levelName } from "./format.js";
export const app = document.getElementById("app");
export const verdict = (v) => verdictHtml(v, t);
const TIERS = ["S", "A", "B", "C"], SETS = ["h", "m", "l"], LEVELS = ["low", "medium", "high"];
export const tierBadge = (x) => (TIERS.includes(x) ? html`<span class="tier ${x}" title="${levelName(x, t)}" aria-label="${levelName(x, t)}">${x}</span>` : "");
export const setBadge = (s) => (SETS.includes(s) ? html`<span class="set ${s}" title="${t("set_" + s + "_long")}">${t("set_" + s)}</span>` : "");
export const deltaText = (d = {}) => {
  const chips = [signed(d.power_ps, " PS"), signed(d.weight_kg, " kg", true)].filter(Boolean);
  return html`${chips.length ? chips.map((c, i) => html`${i ? " " : ""}${c}`) : html`<span class="muted">${t("pp_only")}</span>`}${d.set ? html` <span class="muted">(${t("bop_of", t("set_" + d.set))})</span>` : ""}`;
};
export const level = (l) => (LEVELS.includes(l) ? html`<span class="lvl ${l}">${t(l)}</span>` : "");
export const traits = (b) => b ? html`<div class="chips">${b.strengths.map((s) => html`<span>${I18N[lang].tr[s]}</span>`)}<span class="soft">🛞 ${t(b.tyre_wear)}</span><span class="soft">⛽ ${t(b.fuel_use)}</span></div>` : "";
export const fmtDate = (d) => {
  try { return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", { dateStyle: "medium" }).format(new Date(d)); } catch { return d; }
};
