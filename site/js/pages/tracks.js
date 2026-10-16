import { t, I18N, lang, summary, cap } from "../i18n.js";
import { esc, num, signed } from "../format.js";
import { load, store, state, groupLabel as gl } from "../data.js";
import { app, verdict, tierBadge, setBadge, deltaText, level, rowLinks, traits } from "../ui.js";
const groupLabel = (id) => gl(store.index, id);
import { carById as cb } from "../data.js";
const carById = (id) => cb(store.index, id);

export function trackPicker(selected = "", group = state.group) {
  const opts = store.tracks.map((x) => `<option value="${x.id}" ${x.id === selected ? "selected" : ""}>${esc(x.name)}${x.groups[group]?.events.length ? " ★" : ""}</option>`).join("");
  return `<form class="picker" id="picker">
    <select id="pk-track" aria-label="${t("pick_track")}"><option value="">${t("pick_track")}</option>${opts}</select>
    <div class="seg" id="pk-group">${store.index.groups.map((g) => `<button type="button" class="${g.id === group ? "on" : ""}" data-g="${g.id}">${g.label}</button>`).join("")}</div>
    <button class="btn" type="submit">${t("go")} →</button></form>`;
}
export function bindPicker(group = state.group) {
  let g = group;
  const form = app.querySelector("#picker");
  form.querySelector("#pk-group").onclick = (e) => {
    if (!e.target.dataset.g) return;
    g = e.target.dataset.g;
    form.querySelectorAll("#pk-group button").forEach((b) => b.classList.toggle("on", b.dataset.g === g));
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    const id = form.querySelector("#pk-track").value;
    if (id) location.hash = `#/track/${id}/${g}`;
  };
}

export async function tracksPage() {
  store.tracks ??= await load("tracks.json");
  const render = () => {
    const q = state.tq.toLowerCase();
    const cols = ["h", "m", "l"].map((s) => {
      const list = store.tracks.filter((x) => x.set === s && (!q || x.name.toLowerCase().includes(q)));
      return `<div class="panel"><h2>${setBadge(s)} ${t("set_" + s + "_long")}</h2>${list.map((x) => {
        const n = Object.values(x.groups).reduce((a, g) => a + g.events.length, 0);
        const groups = Object.keys(x.groups).map((g) => `<a class="pill ${x.groups[g].events.length ? "has" : ""}" href="#/track/${x.id}/${g}">${groupLabel(g)}</a>`).join("");
        return `<div class="trk"><a href="#/track/${x.id}/${Object.keys(x.groups).find((g) => x.groups[g].events.length) || "gr3"}"><b>${esc(x.name)}</b></a>
          <small class="muted">${n ? t("with_data", n) : t("no_data")}</small><div>${groups}</div></div>`;
      }).join("") || `<p class="muted">—</p>`}</div>`;
    }).join("");
    app.querySelector("#cols").innerHTML = cols;
  };
  app.innerHTML = `<h1>${t("tracks_title")}</h1><p class="muted">${t("tracks_sub")}</p>
    <div class="toolbar"><input type="search" id="tq" placeholder="${t("search_track")}" value="${esc(state.tq)}"></div><div class="cols3" id="cols"></div>`;
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
  const events = g.events.map((e) => `<div class="ev"><b class="mono">${esc(e.date)}</b> <span class="muted">Race ${esc(e.race)}</span>
    <span>${e.tyres.map((x) => `<span class="tyre ${esc(x.toLowerCase())}">${esc(x)}</span>`).join("")}</span>
    <span class="muted small">${t("fuel")} ${esc(e.fuel)} · ${t("tyre_wear")} ${esc(e.tyre_wear)} · BoP ${esc(e.bop || "?")}</span></div>`).join("");
  const best = g.cars[0]?.score || 1;
  const rows = g.cars.map((c, i) => {
    const car = carById(c.id) || { name: c.id, maker: "", brief: null };
    const lb = c.lb;
    return `<div class="row trow" data-href="#/car/${c.id}">
      <span class="rk mono">${i + 1}</span>${tierBadge(c.tier)}
      <span class="nm"><b>${esc(car.name)}</b><small>${esc(car.maker)}</small></span>
      <span class="sc"><span class="bar"><i style="width:${Math.round((c.score / best) * 100)}%"></i></span><small class="mono">${num(c.score * 100)}</small></span>
      <span class="gp mono">${lb ? `+${num(lb.gap_pct, 2)} %` : "—"}</span>
      <span class="ev2">${lb ? `<span class="badge lb">${t("ev_lb")}</span> <small class="muted">${lb.top100} ${t("top100")}</small>` : `<span class="badge est">${t("ev_model")}</span>`}</span></div>`;
  }).join("");
  app.innerHTML = `
    <p><a href="#/tracks" class="muted">← ${t("tracks_title")}</a></p>
    <section class="panel">
      <div class="toolbar between"><div><h3>${setBadge(tr.set)} ${t("set_" + tr.set + "_long")}</h3><h1>${esc(tr.name)}</h1></div>
      <div class="seg">${Object.keys(tr.groups).map((x) => `<a class="${x === group ? "on" : ""}" href="#/track/${tr.id}/${x}">${groupLabel(x)}</a>`).join("")}</div></div>
      <h3>${t("race_events")}</h3>${events || `<p class="muted">${t("no_events")}</p>`}
    </section>
    <section class="panel"><h2>${t("track_cars")} · ${groupLabel(group)}</h2>
      <div class="rows"><div class="row trow head"><span class="rk">#</span><span>${t("col_tier")}</span><span class="nm">${t("col_car")}</span><span class="sc">${t("score")}</span><span class="gp">${t("gap")}</span><span class="ev2">${t("evidence")}</span></div>${rows}</div>
      <p class="note">${t("gap_note")}</p></section>`;
  rowLinks(app);
}
