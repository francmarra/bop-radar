/* Pure formatting helpers (no DOM, no i18n). */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// html`…` escapes every interpolated value unless it is already Html (a nested html`…` or raw()); arrays are joined, null/undefined render nothing
// (false stays "false": aria-pressed="${on}" needs it)
class Html extends String {}
export const raw = (s) => new Html(s);
const part = (v) => (v instanceof Html ? v : Array.isArray(v) ? v.map(part).join("") : v == null ? "" : esc(v));
export const html = (strings, ...vals) => raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? part(vals[i]) : ""), ""));
export const num = (v, d = 0) => (typeof v === "number" ? v.toFixed(d) : "—");
export const signed = (n, unit = "", goodIfNegative = false) => {
  if (typeof n !== "number") return "";
  const good = goodIfNegative ? n < 0 : n > 0;
  return html`<span class="delta ${good ? "up" : "down"}">${n > 0 ? "+" : ""}${n}${unit}</span>`; // broadcast delta chip: up = faster
};
// direction only, no good/bad colour: PP often rises on nerfed cars, so it must not look like a buff
export const signedNeutral = (n, unit = "") => {
  if (typeof n !== "number") return "";
  return html`<span class="delta flat${n > 0 ? " rise" : n < 0 ? " fall" : ""}">${n > 0 ? "+" : ""}${n}${unit}</span>`;
};
export const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const VERDICT_ICON = { buff: "▲", nerf: "▼", mixed: "◆", unchanged: "=" };
export const verdictHtml = (v, t) => (VERDICT_ICON[v] ? html`<span class="v ${v}">${VERDICT_ICON[v]} ${t(v)}</span>` : html`<span class="muted">—</span>`);
export const levelName = (tier, t) => t("level_" + tier);
let tipSeq = 0;
export const info = (key, t) => {
  const id = `tip-${key}-${++tipSeq}`;
  return html`<span class="info-wrap"><button type="button" class="info" aria-expanded="false" aria-controls="${id}" aria-label="${t("more_about", t("term_" + key))}">ⓘ</button><span role="tooltip" id="${id}" class="tip" hidden>${t("help_" + key)}</span></span>`;
};
// where a class rank comes from: real Daily Race pace or the model
export const sourceBadge = (set, t) => (!set ? "" : set.source === "real"
  ? html`<span class="badge lb">${t("src_pace", set.tracks)}</span>`
  : html`<span class="badge est">${t("src_est")}</span>`);
