import { t, I18N, lang, summary, cap } from "../i18n.js";
import { esc, num, signed } from "../format.js";
import { load, store, state, groupLabel as gl } from "../data.js";
import { app, verdict, tierBadge, setBadge, deltaText, level, traits } from "../ui.js";
const groupLabel = (id) => gl(store.index, id);
import { trackPicker, bindPicker } from "./tracks.js";

export async function homePage() {
  store.tracks ??= await load("tracks.json");
  const u = store.index.updates[0];
  const counts = store.index.groups.map((g) => {
    const c = u.counts[g.id];
    const txt = c ? `<span class="v buff">▲ ${c.buff}</span> <span class="v nerf">▼ ${c.nerf}</span> <span class="v mixed">◆ ${c.mixed}</span>` : `<span class="muted">${t("no_change")}</span>`;
    return `<a class="count" href="#/update/${u.version}"><b>${g.label}</b>${txt}</a>`;
  }).join("");
  app.innerHTML = `
    <section class="hero-grid">
      <div class="panel">
        <h3>${t("latest")}</h3>
        <h1>${t("version")} ${esc(u.version)} <span class="muted mono small">${esc(u.date)}</span></h1>
        <div class="counts">${counts}</div>
        <a class="link-more" href="#/update/${u.version}">${t("see_changes")} →</a>
      </div>
      <div class="panel accent">
        <h3>${t("find_car")}</h3><p class="muted">${t("find_car_sub")}</p>${trackPicker()}
      </div>
    </section>
    <section class="panel">
      <div class="toolbar">
        <div class="seg" id="groups">${store.index.groups.map((g) => `<button class="${g.id === state.group ? "on" : ""}" data-g="${g.id}">${g.label} <small>${g.cars.length}</small></button>`).join("")}</div>
        <div class="seg" id="sets" title="${t("track_type")}">${["h", "m", "l"].map((s) => `<button class="${s === state.set ? "on" : ""}" data-s="${s}">${t("set_" + s)}</button>`).join("")}</div>
        <input type="search" id="q" placeholder="${t("search_car")}" value="${esc(state.q)}">
      </div>
      <div id="ranking"></div>
      <p class="note">${t("rank_note")}</p>
    </section>`;
  bindPicker();
  app.querySelector("#groups").onclick = (e) => { const g = e.target.closest("[data-g]"); if (g) { state.group = g.dataset.g; homePage(); } };
  app.querySelector("#sets").onclick = (e) => { if (e.target.dataset.s) { state.set = e.target.dataset.s; homePage(); } };
  const q = app.querySelector("#q");
  q.oninput = () => { state.q = q.value; renderRanking(); };
  renderRanking();
}

function renderRanking() {
  const g = store.index.groups.find((x) => x.id === state.group);
  const q = state.q.toLowerCase();
  const rows = g.cars
    .filter((c) => !q || (c.name + " " + c.maker).toLowerCase().includes(q))
    .sort((a, b) => a.sets[state.set].rank - b.sets[state.set].rank)
    .map((c) => {
      const s = c.sets[state.set], lc = c.last_change;
      return `<a class="row" href="#/car/${c.id}">
        <span class="rk mono">${s.rank}</span>${tierBadge(s.tier)}
        <span class="nm"><b>${esc(c.name)}</b><small>${esc(c.maker)} · ${esc(c.drivetrain)}</small></span>
        <span class="pp mono">${num(s.pp, 2)}</span>
        <span class="bs">${setBadge(c.best_set)}</span>
        <span class="lc">${lc ? `${verdict(lc.verdict)} <small class="mono">${lc.v}</small>` : "—"}</span>
        <span class="tr">${traits(c.brief)}</span></a>`;
    }).join("");
  const el = app.querySelector("#ranking");
  el.innerHTML = `<div class="rows"><div class="row head"><span class="rk">#</span><span>${t("col_tier")}</span><span class="nm">${t("col_car")}</span><span class="pp">${t("col_pp")}</span><span class="bs">${t("col_best")}</span><span class="lc">${t("col_last")}</span><span class="tr">${t("col_traits")}</span></div>${rows || `<p class="muted pad">${t("no_match")}</p>`}</div>`;
}
