import { t } from "../i18n.js";
import { BASE } from "../router.js";
import { html, info, sourceBadge } from "../format.js";
import { store, state } from "../data.js";
import { app, verdict, tierBadge, setBadge } from "../ui.js";
import { carImg } from "../carimg.js";

// class leader on a track type (the landing hero shows it)
export const topCar = (g, set) => g.cars.reduce((best, c) => (!best || c.sets[set].rank < best.sets[set].rank ? c : best), undefined);

export function rankingPage() {
  const ix = store.index;
  showAll = false;
  app.innerHTML = html`
    <h1>${t("ranking_title")}</h1>
    <section class="panel">
      <div class="toolbar">
        <div class="seg" id="groups" role="group" aria-label="${t("ranking_title")}">${ix.groups.map((g) => html`<button type="button" class="${g.id === state.group ? "on" : ""}" aria-pressed="${g.id === state.group}" data-g="${g.id}">${g.label} <small>${g.cars.length}</small></button>`)}</div>
        <div class="seg" id="sets" role="group" aria-label="${t("track_type")}">${["h", "m", "l"].map((s) => html`<button type="button" class="${s === state.set ? "on" : ""}" aria-pressed="${s === state.set}" data-s="${s}">${t("set_" + s)}</button>`)}</div>
      </div>
      <div id="ranking"></div>
      <p class="note">${t("rank_note")}</p>
    </section>`;
  app.querySelector("#groups").onclick = (e) => { const b = e.target.closest("[data-g]"); if (b) { state.group = b.dataset.g; pressed("#groups", "g", state.group); renderRanking(); } };
  app.querySelector("#sets").onclick = (e) => { const b = e.target.closest("[data-s]"); if (b) { state.set = b.dataset.s; pressed("#sets", "s", state.set); renderRanking(); } };
  renderRanking();
}

function pressed(sel, key, value) {
  app.querySelectorAll(`${sel} button`).forEach((b) => { const on = b.dataset[key] === value; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
}

const TOP = 10;
let showAll = false; // the full class list made the phone page ~13 000 px tall

function renderRanking() {
  const g = store.index.groups.find((x) => x.id === state.group);
  const sorted = g.cars.slice().sort((a, b) => a.sets[state.set].rank - b.sets[state.set].rank);
  const rows = (showAll ? sorted : sorted.slice(0, TOP))
    .map((c) => {
      const s = c.sets[state.set], lc = c.last_change;
      return html`<a class="row rk-row" href="${BASE}car/${encodeURIComponent(c.id)}/">
        <span class="pos ${s.tier}">${s.rank}</span><span class="im">${carImg(c.id, "s")}</span><span class="lv">${tierBadge(s.tier)}</span>
        <span class="nm"><b>${c.name}</b><small>${c.maker} · ${c.drivetrain}</small>${sourceBadge(s, t)}</span>
        <span class="bs${c.best_set === state.set ? " same" : ""}">${setBadge(c.best_set)}</span>
        <span class="lc">${lc ? html`${verdict(lc.verdict)} <small class="mono">${lc.v}</small>` : "—"}</span></a>`;
    });
  app.querySelector("#ranking").innerHTML = html`<div class="rows"><div class="row rk-row head"><span class="pos">#</span><span class="im"></span><span class="lv">${t("col_tier")} ${info("level", t)}</span><span class="nm">${t("col_car")}</span><span class="bs">${t("col_best")} ${info("track_types", t)}</span><span class="lc">${t("col_last")}</span></div>${rows}</div>
    ${sorted.length > rows.length ? html`<button type="button" class="btn ghost mt" id="more">${t("show_all", sorted.length)}</button>` : ""}`;
  const more = app.querySelector("#more");
  if (more) more.onclick = () => { showAll = true; renderRanking(); app.querySelectorAll("#ranking a.row")[TOP]?.focus(); };
}
