import { t, lang } from "../i18n.js";
import { BASE } from "../router.js";
import { esc, info, sourceBadge } from "../format.js";
import { load, store, state } from "../data.js";
import { app, verdict, tierBadge, setBadge, deltaText, fmtDate } from "../ui.js";
import { mountSearch } from "../search.js";
import { mostAffected, classSentence } from "../bop.js";
import { weekStrip } from "./week.js";
import { carImg } from "../carimg.js";


export async function homePage() {
  const ix = store.index;
  const u = ix.updates[0];
  const [detail, strip] = await Promise.all([load(`updates/${u.version}.json`), weekStrip()]);
  const classCards = ix.groups.map((g) => {
    const cars = mostAffected(detail.groups[g.id]);
    return `<div class="card cls"><h3>${esc(g.label)}</h3><p class="cls-sentence">${esc(classSentence(u.counts?.[g.id], g.label, t))}</p>
      ${cars.length ? `<p class="small muted">${t("most_affected")}</p><ul class="affected">${cars.map((c) => `
        <li>${carImg(c.id, "s")}<div><a href="${BASE}car/${encodeURIComponent(c.id)}/">${esc(c.name)}</a> ${verdict(c.verdict)} <span class="mono small">${deltaText(c.delta)}</span></div></li>`).join("")}</ul>` : ""}</div>`;
  }).join("");

  app.innerHTML = `
    <section class="panel hero">
      <h1>${t("home_title")}</h1>
      <p class="lead">${t("bop_explain")}</p>
      <label class="find-label" for="car-q">${t("find_label")}</label>
      <div class="search">
        <input id="car-q" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="car-list" autocomplete="off" placeholder="${t("find_ph")}">
        <ul id="car-list" role="listbox" class="suggest" aria-label="${t("find_label")}" hidden></ul>
      </div>
      <p id="car-empty" class="muted" role="status" data-msg="${esc(t("find_empty"))}" hidden></p>
    </section>
    ${strip}
    <section class="panel">
      <h2>${t("latest")}: ${t("version")} ${esc(u.version)}</h2>
      <p class="muted">${t("date_fmt")} ${esc(fmtDate(u.date))}</p>
      <div class="cls-grid">${classCards}</div>
      <a class="btn mt" href="${BASE}update/${encodeURIComponent(u.version)}/">${t("see_changes")} →</a>
    </section>
    <section class="panel">
      <h2>${t("ranking_title")}</h2>
      <div class="toolbar">
        <div class="seg" id="groups" role="group" aria-label="${t("ranking_title")}">${ix.groups.map((g) => `<button type="button" class="${g.id === state.group ? "on" : ""}" aria-pressed="${g.id === state.group}" data-g="${esc(g.id)}">${esc(g.label)} <small>${g.cars.length}</small></button>`).join("")}</div>
        <div class="seg" id="sets" role="group" aria-label="${t("track_type")}">${["h", "m", "l"].map((s) => `<button type="button" class="${s === state.set ? "on" : ""}" aria-pressed="${s === state.set}" data-s="${s}">${t("set_" + s)}</button>`).join("")}</div>
      </div>
      <div id="ranking"></div>
      <p class="note">${t("rank_note")}</p>
    </section>`;
  mountSearch(app.querySelector("#car-q"), ix, { listbox: app.querySelector("#car-list"), empty: app.querySelector("#car-empty") });
  app.querySelector("#groups").onclick = (e) => { const b = e.target.closest("[data-g]"); if (b) { state.group = b.dataset.g; pressed("#groups", "g", state.group); renderRanking(); } };
  app.querySelector("#sets").onclick = (e) => { const b = e.target.closest("[data-s]"); if (b) { state.set = b.dataset.s; pressed("#sets", "s", state.set); renderRanking(); } };
  renderRanking();
}

function pressed(sel, key, value) {
  app.querySelectorAll(`${sel} button`).forEach((b) => { const on = b.dataset[key] === value; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
}

function renderRanking() {
  const g = store.index.groups.find((x) => x.id === state.group);
  const rows = g.cars
    .slice().sort((a, b) => a.sets[state.set].rank - b.sets[state.set].rank)
    .map((c) => {
      const s = c.sets[state.set], lc = c.last_change;
      return `<a class="row rk-row" href="${BASE}car/${encodeURIComponent(c.id)}/">
        <span class="pos ${esc(s.tier)}">${s.rank}</span><span class="im">${carImg(c.id, "s")}</span><span class="lv">${tierBadge(s.tier)}</span>
        <span class="nm"><b>${esc(c.name)}</b><small>${esc(c.maker)} · ${esc(c.drivetrain)}</small>${sourceBadge(s, t)}</span>
        <span class="bs">${setBadge(c.best_set)}</span>
        <span class="lc">${lc ? `${verdict(lc.verdict)} <small class="mono">${esc(lc.v)}</small>` : "—"}</span></a>`;
    }).join("");
  app.querySelector("#ranking").innerHTML = `<div class="rows"><div class="row rk-row head"><span class="pos">#</span><span class="im"></span><span class="lv">${t("col_tier")} ${info("level", t)}</span><span class="nm">${t("col_car")}</span><span class="bs">${t("col_best")} ${info("track_types", t)}</span><span class="lc">${t("col_last")}</span></div>${rows}</div>`;
}
