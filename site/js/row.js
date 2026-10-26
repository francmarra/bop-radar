// one compact car row shared by ranking, week, updates and tracks
import { t } from "./i18n.js";
import { html } from "./format.js";
import { tierBadge } from "./ui.js";
import { carImg } from "./carimg.js";

// no href (car not in the index) -> same look, not a link
export const carRow = ({ href, id, name, sub, pos, tier, estimate, end }) => {
  const cls = `row cr${pos == null ? " nopos" : ""}`;
  const inner = html`${pos == null ? "" : html`<span class="pos ${tier}">${pos}</span>`}<span class="im">${carImg(id, "s")}</span><span class="nm"><b>${name}</b>${sub ? html`<small>${sub}</small>` : ""}</span><span class="lv">${tierBadge(tier)}${estimate ? html`<sup class="est" title="${t("est_mark")}"><span aria-hidden="true">*</span><span class="sr">${t("est_mark")}</span></sup>` : ""}</span><span class="end">${end}</span>`;
  return href ? html`<a class="${cls}" href="${href}">${inner}</a>` : html`<div class="${cls}">${inner}</div>`;
};
