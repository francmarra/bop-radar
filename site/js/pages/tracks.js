import { t } from "../i18n.js";
import { BASE } from "../router.js";
import { html, num } from "../format.js";
import { load, store, state, groupLabel as gl } from "../data.js";
import { app, tierBadge, setBadge } from "../ui.js";
const groupLabel = (id) => gl(store.index, id);
import { carById as cb } from "../data.js";
import { carImg } from "../carimg.js";
const carById = (id) => cb(store.index, id);

export async function tracksPage() {
  store.tracks ??= await load("tracks.json");
  const render = () => {
    const q = state.tq.toLowerCase();
    const cols = ["h", "m", "l"].map((s) => {
      const list = store.tracks.filter((x) => x.set === s && (!q || x.name.toLowerCase().includes(q)));
      return html`<div class="panel"><h2>${setBadge(s)} ${t("set_" + s + "_long")}</h2>${list.length ? list.map((x) => {
        const n = Object.values(x.groups).reduce((a, g) => a + g.events.length, 0);
        const groups = Object.keys(x.groups).map((g) => html`<a class="pill ${x.groups[g].events.length ? "has" : ""}" href="${BASE}track/${encodeURIComponent(x.id)}/${encodeURIComponent(g)}/">${groupLabel(g)}</a>`);
        return html`<div class="trk"><a href="${BASE}track/${encodeURIComponent(x.id)}/${Object.keys(x.groups).find((g) => x.groups[g].events.length) || "gr3"}/"><b>${x.name}</b></a>
          <small class="muted">${n ? t("with_data", n) : t("no_data")}</small><div>${groups}</div></div>`;
      }) : html`<p class="muted">—</p>`}</div>`;
    });
    app.querySelector("#cols").innerHTML = html`${cols}`;
  };
  app.innerHTML = html`<h1>${t("tracks_title")}</h1><p class="muted">${t("tracks_sub")}</p>
    <div class="toolbar"><input type="search" id="tq" placeholder="${t("search_track")}" value="${state.tq}"></div><div class="cols3" id="cols"></div>`;
  const tq = app.querySelector("#tq");
  tq.oninput = () => { state.tq = tq.value; render(); };
  render();
}

export async function trackPage(id, group) {
  store.tracks ??= await load("tracks.json");
  const tr = store.tracks.find((x) => x.id === id);
  if (!tr) throw new Error(id);
  group = tr.groups[group] ? group : Object.keys(tr.groups)[0];
  state.group = group;
  const g = tr.groups[group];
  const events = g.events.map((e) => html`<div class="ev"><b class="mono">${e.date}</b> <span class="muted">Race ${e.race}</span>
    <span>${e.tyres.map((x) => html`<span class="tyre ${x.toLowerCase()}">${x}</span>`)}</span>
    <span class="muted small">${t("fuel")} ${e.fuel} · ${t("tyre_wear")} ${e.tyre_wear} · BoP ${e.bop || "?"}</span></div>`);
  const best = g.cars[0]?.score || 1;
  const rows = g.cars.map((c, i) => {
    const car = carById(c.id) || { name: c.id, maker: "", brief: null };
    const lb = c.lb;
    return html`<a class="row trow" href="${BASE}car/${encodeURIComponent(c.id)}/">
      <span class="pos ${c.tier}">${i + 1}</span><span class="im">${carImg(c.id, "s")}</span><span class="lv">${tierBadge(c.tier)}</span>
      <span class="nm"><b>${car.name}</b><small>${car.maker}</small></span>
      <span class="sc"><span class="bar"><i style="width:${Math.round((c.score / best) * 100)}%"></i></span><small class="mono">${num(c.score * 100)}</small></span>
      <span class="gp mono">${lb ? `+${num(lb.gap_pct, 2)} %` : "—"}</span>
      <span class="ev2">${lb ? html`<span class="badge lb">${t("ev_lb")}</span> <small class="muted">${lb.top100} ${t("top100")}</small>` : html`<span class="badge est">${t("ev_model")}</span>`}</span></a>`;
  });
  app.innerHTML = html`
    <p><a href="${BASE}tracks/" class="muted">← ${t("tracks_title")}</a></p>
    <section class="panel">
      <div class="toolbar between"><div><h3>${setBadge(tr.set)} ${t("set_" + tr.set + "_long")}</h3><h1>${tr.name}</h1></div>
      <div class="seg">${Object.keys(tr.groups).map((x) => html`<a class="${x === group ? "on" : ""}" href="${BASE}track/${encodeURIComponent(tr.id)}/${encodeURIComponent(x)}/">${groupLabel(x)}</a>`)}</div></div>
      <h3>${t("race_events")}</h3>${events.length ? events : html`<p class="muted">${t("no_events")}</p>`}
    </section>
    <section class="panel"><h2>${t("track_cars")} · ${groupLabel(group)}</h2>
      <div class="rows"><div class="row trow head"><span class="pos">#</span><span class="im"></span><span class="lv">${t("col_tier")}</span><span class="nm">${t("col_car")}</span><span class="sc">${t("score")}</span><span class="gp">${t("gap")}</span><span class="ev2">${t("evidence")}</span></div>${rows}</div>
      <p class="note">${t("gap_note")}</p></section>`;
}
