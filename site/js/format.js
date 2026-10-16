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
export const verdictHtml = (v, t) => (v ? `<span class="v ${v}">${VERDICT_ICON[v] ?? ""} ${t(v)}</span>` : `<span class="muted">—</span>`);
export const levelName = (tier, t) => t("level_" + tier);
