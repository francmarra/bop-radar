/* Pure formatting helpers (no DOM, no i18n). */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const num = (v, d = 0) => (typeof v === "number" ? v.toFixed(d) : "—");
export const signed = (n, unit = "", goodIfNegative = false) => {
  if (typeof n !== "number") return "";
  const good = goodIfNegative ? n < 0 : n > 0;
  return `<span class="${good ? "pos" : "neg"}">${n > 0 ? "+" : ""}${n}${unit}</span>`;
};
export const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const VERDICT_ICON = { buff: "▲", nerf: "▼", mixed: "◆", unchanged: "=" };
export const verdictHtml = (v, t) => (VERDICT_ICON[v] ? `<span class="v ${v}">${VERDICT_ICON[v]} ${esc(t(v))}</span>` : `<span class="muted">—</span>`);
export const levelName = (tier, t) => t("level_" + tier);
let tipSeq = 0;
export const info = (key, t) => {
  const id = `tip-${key}-${++tipSeq}`;
  return `<span class="info-wrap"><button type="button" class="info" aria-expanded="false" aria-controls="${id}" aria-label="${esc(t("more_about", t("term_" + key)))}">ⓘ</button>`
    + `<span role="tooltip" id="${id}" class="tip" hidden>${esc(t("help_" + key))}</span></span>`;
};
// where a class rank comes from: real Daily Race pace or the model
export const sourceBadge = (set, t) => (!set ? "" : set.source === "real"
  ? `<span class="badge lb">${esc(t("src_pace", set.tracks))}</span>`
  : `<span class="badge est">${esc(t("src_est"))}</span>`);
