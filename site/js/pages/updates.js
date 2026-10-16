import { t, I18N, lang, summary, cap } from "../i18n.js";
import { esc, num, signed } from "../format.js";
import { load, store, state, groupLabel as gl } from "../data.js";
import { app, verdict, tierBadge, setBadge, deltaText, level, traits } from "../ui.js";
const groupLabel = (id) => esc(gl(store.index, id));

export function updatesPage() {
  app.innerHTML = `<h1>${t("updates_title")}</h1><p class="muted">${t("updates_sub")}</p>
    <div class="panel updates">${store.index.updates.map((u) => `
      <a href="#/update/${encodeURIComponent(u.version)}"><b class="mono">${esc(u.version)}</b><span class="muted mono">${esc(u.date)}</span>
      <span>${Object.entries(u.counts).map(([g, c]) => `<span class="ug"><b>${groupLabel(g)}</b> <span class="v buff">▲${c.buff}</span> <span class="v nerf">▼${c.nerf}</span>${c.mixed ? ` <span class="v mixed">◆${c.mixed}</span>` : ""}</span>`).join("")}</span></a>`).join("")}
    </div>`;
}

export async function updatePage(v) {
  const u = await load(`updates/${v}.json`);
  const i = store.index.updates.findIndex((x) => x.version === v);
  const prev = store.index.updates[i + 1], next = store.index.updates[i - 1];
  const order = { buff: 0, mixed: 1, nerf: 2 };
  const sections = store.index.groups.filter((g) => u.groups[g.id]).map((g) => {
    const rows = u.groups[g.id].sort((a, b) => order[a.verdict] - order[b.verdict] || a.rank - b.rank).map((c) => `
      <a class="row urow" href="#/car/${encodeURIComponent(c.id)}"><span>${verdict(c.verdict)}</span><span class="nm"><b>${esc(c.name)}</b></span>
      <span class="mono">${deltaText(c.delta)}</span><span class="mono">${signed(c.delta.pp)}</span><span class="mono">${c.rank}</span>
      <span class="sm muted">${esc(summary(c.brief))}</span></a>`).join("");
    return `<section class="panel"><h2>${esc(g.label)} <span class="muted small">${t("cars_changed", u.groups[g.id].length)}</span></h2>
      <div class="rows"><div class="row urow head"><span>${t("col_verdict")}</span><span class="nm">${t("col_car")}</span><span>${t("col_pw")}</span><span>${t("col_dpp")}</span><span>${t("col_rank")}</span><span class="sm">${t("col_context")}</span></div>${rows}</div></section>`;
  }).join("");
  app.innerHTML = `
    <div class="toolbar between">
      <div><h3>BoP</h3><h1>${t("version")} ${esc(u.version)} <span class="muted mono small">${esc(u.date)}</span></h1></div>
      <div class="seg">${prev ? `<a href="#/update/${encodeURIComponent(prev.version)}">← ${esc(prev.version)}</a>` : ""}${next ? `<a href="#/update/${encodeURIComponent(next.version)}">${esc(next.version)} →</a>` : ""}</div>
    </div><p class="muted">${t("update_note")}</p>${sections}`;
}
