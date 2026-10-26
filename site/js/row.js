// one compact car row shared by ranking, week, updates and tracks
import { t } from "./i18n.js";
import { html } from "./format.js";
import { tierBadge } from "./ui.js";
import { carImg } from "./carimg.js";

export const carRow = ({ href, id, name, sub, pos, tier, estimate, end }) => html`<a class="row cr${pos == null ? " nopos" : ""}" href="${href}">${pos == null ? "" : html`<span class="pos ${tier}">${pos}</span>`}<span class="im">${carImg(id, "s")}</span><span class="nm"><b>${name}</b>${sub ? html`<small>${sub}</small>` : ""}</span><span class="lv">${tierBadge(tier)}${estimate ? html`<sup class="est" title="${t("est_mark")}" aria-label="${t("est_mark")}">*</sup>` : ""}</span><span class="end">${end}</span></a>`;
