import { t } from "../i18n.js";
import { updateTotals } from "../bop.js";
import { BASE } from "../router.js";
import { html, info, num, verdictArrow } from "../format.js";
import { load, store } from "../data.js";
import { app, deltaText } from "../ui.js";
import { carRow } from "../row.js";

export function updatesPage() {
  app.innerHTML = html`<h1>${t("updates_title")}</h1><p class="muted">${t("updates_sub")}</p>
    <div class="panel updates">${store.index.updates.map((u) => { const tot = updateTotals(u.counts); return html`
      <a href="${BASE}update/${encodeURIComponent(u.version)}/"><b class="mono">${u.version}</b><span class="muted mono">${u.date}</span>
      <span><span class="v buff">▲ ${tot.buff}</span> <span class="v nerf">▼ ${tot.nerf}</span>${tot.mixed ? html` <span class="v mixed">◆ ${tot.mixed}</span>` : ""}</span></a>`; })}
    </div>`;
}

export async function updatePage(v) {
  const u = await load(`updates/${v}.json`);
  const i = store.index.updates.findIndex((x) => x.version === v);
  const prev = store.index.updates[i + 1], next = store.index.updates[i - 1];
  const order = { buff: 0, mixed: 1, nerf: 2 };
  const sections = store.index.groups.filter((g) => u.groups[g.id]).map((g) => {
    const rows = u.groups[g.id].sort((a, b) => order[a.verdict] - order[b.verdict] || a.rank - b.rank).map((c) => carRow({ href: `${BASE}car/${encodeURIComponent(c.id)}/`, id: c.id, name: c.name, sub: deltaText(c.delta), pos: c.rank, end: verdictArrow(c.verdict, t) }));
    const bal = u.balance?.[g.id], prev = store.index.updates.slice(i + 1).find((x) => x.balance?.[g.id])?.balance[g.id];
    return html`<section class="panel"><h2>${g.label} <span class="muted small">${t("cars_changed", u.groups[g.id].length)}</span></h2>
      ${bal ? html`<p class="muted small">${t("bal_update", num(bal.cars, 1), bal.events)}${prev ? ` · ${t("bal_prev", num(prev.cars, 1))}` : ""} ${info("balance_idx", t)}</p>` : ""}
      <div class="rows">${rows}</div></section>`;
  });
  app.innerHTML = html`
    <div class="toolbar between">
      <div><h3>BoP</h3><h1>${t("version")} ${u.version} <span class="muted mono small">${u.date}</span></h1></div>
      <div class="seg">${prev ? html`<a href="${BASE}update/${encodeURIComponent(prev.version)}/">← ${prev.version}</a>` : ""}${next ? html`<a href="${BASE}update/${encodeURIComponent(next.version)}/">${next.version} →</a>` : ""}</div>
    </div><p class="muted">${t("update_note")}</p>${sections}`;
}
