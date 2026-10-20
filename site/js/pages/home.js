import { t } from "../i18n.js";
import { BASE } from "../router.js";
import { html, vtext } from "../format.js";
import { load, store, state } from "../data.js";
import { app, tierBadge, fmtDate } from "../ui.js";
import { mountSearch } from "../search.js";
import { classSentence } from "../bop.js";
import { weekRaces } from "./week.js";
import { heroPic } from "./car.js";
import { topCar } from "./ranking.js";

const carHref = (c) => `${BASE}car/${encodeURIComponent(c.id)}/`;

// entry page: chrome hero with the current class leader, then one card per section of the site
export async function homePage() {
  const ix = store.index;
  const u = ix.updates[0];
  const g = ix.groups.find((x) => x.id === state.group) ?? ix.groups[0];
  const lead = topCar(g, state.set);
  const races = await weekRaces();
  const leaders = ix.groups.map((x) => [x, topCar(x, state.set)]).filter(([, c]) => c);

  app.innerHTML = html`
    <section class="panel car-hero landing">
      <div class="hero-txt">
        <p class="hero-labels"><span>Gr.1–4</span><span>BoP</span><span>Daily Races</span></p>
        <h1>${t("home_title")}</h1>
        <p class="lead">${t("bop_explain")}</p>
        <label class="find-label" for="car-q">${t("find_label")}</label>
        <div class="search">
          <input id="car-q" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="car-list" autocomplete="off" placeholder="${t("find_ph")}">
          <ul id="car-list" role="listbox" class="suggest" aria-label="${t("find_label")}" hidden></ul>
        </div>
        <p id="car-empty" class="muted" role="status" data-msg="${t("find_empty")}" hidden></p>
      </div>
      ${lead ? html`<div class="hero-feat"><div class="hero-pic">${heroPic(lead.id)}</div>
        <p class="hero-cap"><a href="${carHref(lead)}">${tierBadge(lead.sets[state.set].tier)} ${t("leader", g.label)}: <b>${lead.name}</b></a></p></div>` : ""}
      ${vtext("バランス")}
    </section>
    <div class="entry-grid">
      <section class="card entry"><h2>${t("nav_rankings")}</h2>
        <ul class="entry-list">${leaders.map(([x, c]) => html`<li><span class="mono">${x.label}</span> <a href="${carHref(c)}">${c.name}</a></li>`)}</ul>
        <a class="link-more" href="${BASE}ranking/">${t("see_ranking")} →</a></section>
      <section class="card entry"><h2>${t("week_strip")}</h2>
        ${races.length ? html`<ul class="entry-list">${races.map((r) => html`<li><span class="letter sm" aria-hidden="true">${r.race}</span> ${r.track}</li>`)}</ul>` : ""}
        <a class="link-more" href="${BASE}week/">${t("see_guide")} →</a></section>
      ${u ? html`<section class="card entry"><h2>${t("latest")}</h2>
        <p><b class="mono">${t("version")} ${u.version}</b> <span class="muted">· ${fmtDate(u.date)}</span></p>
        <ul class="entry-list">${ix.groups.map((x) => html`<li><span class="mono">${x.label}</span> ${classSentence(u.counts?.[x.id], x.label, t)}</li>`)}</ul>
        <a class="link-more" href="${BASE}update/${encodeURIComponent(u.version)}/">${t("see_changes")} →</a></section>` : ""}
      <section class="card entry"><h2>${t("help_title")}</h2><p>${t("landing_help")}</p>
        <a class="link-more" href="${BASE}help/">${t("see_help")} →</a></section>
    </div>`;
  mountSearch(app.querySelector("#car-q"), ix, { listbox: app.querySelector("#car-list"), empty: app.querySelector("#car-empty") });
}
