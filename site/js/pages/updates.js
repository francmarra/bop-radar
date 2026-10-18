import { t, summary } from "../i18n.js";
import { BASE } from "../router.js";
import { html, signedNeutral } from "../format.js";
import { load, store, groupLabel as gl } from "../data.js";
import { app, verdict, deltaText } from "../ui.js";
import { carImg } from "../carimg.js";
const groupLabel = (id) => gl(store.index, id);

export function updatesPage() {
  app.innerHTML = html`<h1>${t("updates_title")}</h1><p class="muted">${t("updates_sub")}</p>
    <div class="panel updates">${store.index.updates.map((u) => html`
      <a href="${BASE}update/${encodeURIComponent(u.version)}/"><b class="mono">${u.version}</b><span class="muted mono">${u.date}</span>
      <span>${Object.entries(u.counts).map(([g, c]) => html`<span class="ug"><b>${groupLabel(g)}</b> <span class="v buff">▲${c.buff}</span> <span class="v nerf">▼${c.nerf}</span>${c.mixed ? html` <span class="v mixed">◆${c.mixed}</span>` : ""}</span>`)}</span></a>`)}
    </div>`;
}

export async function updatePage(v) {
  const u = await load(`updates/${v}.json`);
  const i = store.index.updates.findIndex((x) => x.version === v);
  const prev = store.index.updates[i + 1], next = store.index.updates[i - 1];
  const order = { buff: 0, mixed: 1, nerf: 2 };
  const sections = store.index.groups.filter((g) => u.groups[g.id]).map((g) => {
    const rows = u.groups[g.id].sort((a, b) => order[a.verdict] - order[b.verdict] || a.rank - b.rank).map((c) => html`
      <a class="row urow" href="${BASE}car/${encodeURIComponent(c.id)}/"><span class="vd">${verdict(c.verdict)}</span><span class="im">${carImg(c.id, "s")}</span><span class="nm"><b>${c.name}</b></span>
      <span class="mono pw">${deltaText(c.delta)}</span><span class="mono dp">${signedNeutral(c.delta.pp)}</span><span class="mono rkn">${c.rank}</span>
      <span class="sm muted">${summary(c.brief)}</span></a>`);
    return html`<section class="panel"><h2>${g.label} <span class="muted small">${t("cars_changed", u.groups[g.id].length)}</span></h2>
      <div class="rows"><div class="row urow head"><span class="vd">${t("col_verdict")}</span><span class="im"></span><span class="nm">${t("col_car")}</span><span class="pw">${t("col_pw")}</span><span class="dp">${t("col_dpp")}</span><span class="rkn">${t("col_rank")}</span><span class="sm">${t("col_context")}</span></div>${rows}</div></section>`;
  });
  app.innerHTML = html`
    <div class="toolbar between">
      <div><h3>BoP</h3><h1>${t("version")} ${u.version} <span class="muted mono small">${u.date}</span></h1></div>
      <div class="seg">${prev ? html`<a href="${BASE}update/${encodeURIComponent(prev.version)}/">← ${prev.version}</a>` : ""}${next ? html`<a href="${BASE}update/${encodeURIComponent(next.version)}/">${next.version} →</a>` : ""}</div>
    </div><p class="muted">${t("update_note")}</p>${sections}`;
}
