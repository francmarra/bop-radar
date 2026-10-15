"use strict";
/* GT7 BoP Tracker — static SPA (hash routes): #/ · #/tracks · #/track/<id>/<group> · #/car/<id> · #/updates · #/update/<v> · #/about */
const app = document.getElementById("app");
const cache = {};
let index = null, tracks = null;
const state = { group: "gr3", set: "m", q: "", tq: "" };

/* ---------- i18n ---------- */
const I18N = {
  en: {
    nav_rankings: "Rankings", nav_tracks: "Tracks", nav_updates: "Updates", nav_about: "About",
    loading: "Loading…", load_error: "Could not load data", latest: "Latest BoP update", version: "Version",
    see_changes: "See all changes", no_change: "no change", search_car: "Search car or maker…", search_track: "Search track…",
    track_type: "Track type", set_h: "Fast", set_m: "Medium", set_l: "Twisty",
    set_h_long: "High-speed tracks", set_m_long: "Mid-speed tracks", set_l_long: "Low-speed tracks",
    col_car: "Car", col_pp: "PP", col_best: "Best on", col_last: "Last change", col_traits: "Traits", col_tier: "Tier",
    rank_note: "Rank = PP under the selected track type's BoP. Tiers: S top 10 %, A ≤35 %, B ≤70 %, C rest.",
    no_match: "No cars match.", find_car: "Which car for which track?", find_car_sub: "Pick a track and a class to see the best cars, from real leaderboard times.",
    pick_track: "Choose a track", go: "Show cars", tyres: "Tyres", fuel: "Fuel", tyre_wear: "Tyre wear", fuel_use: "Fuel use",
    buff: "buff", nerf: "nerf", mixed: "mixed", unchanged: "unchanged", first_seen: "first seen",
    pp_only: "PP only", bop_of: (s) => `${s} BoP`,
    updates_title: "BoP updates", updates_sub: "Every game version that changed power or weight of a Gr.1–4 car.",
    cars_changed: (n) => `${n} cars changed`, update_note: "Verdict = average power-to-weight change over the BoP sets that changed: buff > +0.25 %, nerf < −0.25 %, otherwise mixed.",
    col_verdict: "Verdict", col_pw: "Power / weight", col_dpp: "ΔPP", col_rank: "Rank", col_context: "Context after update",
    back_rank: (g) => `← ${g} rankings`, ctx_title: (v, d) => `Performance at ${v} (${d})`, ctx_hint: "Pick a row in “BoP changes” to see an older update",
    track_fit: "Track fit", strengths: "Strengths", weaknesses: "Weaknesses", none: "nothing stands out", estimates: "Estimates relative to the class (weight, torque, drivetrain, power).",
    specs: "Specs (medium-track BoP)", power: "Power", weight: "Weight", balance: "Balance F:R", handling: "Handling", notes: "Notes",
    history: "History", bop_changes: "BoP changes", col_version: "Version", col_date: "Date",
    track_record: "Leaderboard record", track_record_sub: "Daily Race results with this car (top 1000 laps per event).", gap: "Gap", events: "Events",
    tracks_title: "Tracks", tracks_sub: "Choose a layout to see which cars are fastest there.", with_data: (n) => `${n} leaderboard events`, no_data: "model estimate only",
    track_cars: "Best cars", score: "Score", evidence: "Evidence", ev_lb: "Leaderboard", ev_model: "Estimate",
    gap_note: "Gap = median of the car's best 20 laps vs. the 20 fastest laps of the event (top 1000 laps). Older events and events before the car's last BoP change count less.",
    top100: "in top 100", race_events: "Daily Race events", no_events: "No Daily Race with this class here yet — ranking is the model's estimate for this track type.",
    low: "low", medium: "medium", high: "high", neutral: "neutral", understeer: "understeer", oversteer: "oversteer",
    footer_est: "tyre wear & fuel are estimates", unofficial: "not affiliated with Polyphony Digital",
    tr: { "straight-line speed": "straight-line speed", acceleration: "acceleration", "low-speed cornering": "low-speed cornering", "high-speed cornering": "high-speed cornering" },
    summary(b) {
      const p = [];
      const d = b.delta || {};
      if (b.changed && (d.power_ps || d.weight_kg)) {
        const bits = [d.power_ps && `${d.power_ps > 0 ? "+" : ""}${d.power_ps} PS`, d.weight_kg && `${d.weight_kg > 0 ? "+" : ""}${d.weight_kg} kg`].filter(Boolean);
        p.push(`${cap(this[b.verdict] || b.verdict)} (${bits.join(", ")}).`);
      }
      const set = this["set_" + b.best_set + "_long"].toLowerCase();
      p.push(`Ranked ${b.rank}/${b.of} (${b.tier} tier), ${b.all_rounder ? `an all-rounder with a slight edge on ${set}` : `best on ${set}`}.`);
      if (b.strengths.length) p.push(`Good at ${b.strengths.map((s) => this.tr[s]).join(", ")}.`);
      p.push(`Estimated tyre wear ${this[b.tyre_wear]}, fuel use ${this[b.fuel_use]}.`);
      return p.join(" ");
    },
    about: `<h1>About</h1>
      <p>Tracks Gran Turismo 7 <b>Balance of Performance</b> for Gr.1–Gr.4. Since 1.19 the game uses three BoP sets — high-, mid- and low-speed — picked by track.</p>
      <h2>How cars are rated</h2><ul>
      <li><b>Rank / tier</b>: PP within the class under each BoP set.</li>
      <li><b>Verdict</b>: change in power-to-weight vs. the previous version.</li>
      <li><b>Track fit</b>: half PP rank, half the traits each track type rewards (straight-line speed, cornering at 60/120/240 km/h, acceleration).</li>
      <li><b>Per-track rating</b>: 70 % real pace from Daily Race leaderboards on that exact layout (top 1000 laps per event, newer events and events after the car's last BoP change weigh more) + 30 % model fit. Without leaderboard data the rating is the model's estimate.</li>
      <li><b>Tyre wear &amp; fuel</b>: heuristic estimates — not measured yet. Real values will come from <a href="https://github.com/francmarra">gt7-telemetry</a>.</li></ul>`,
  },
  pt: {
    nav_rankings: "Rankings", nav_tracks: "Pistas", nav_updates: "Atualizações", nav_about: "Sobre",
    loading: "A carregar…", load_error: "Não foi possível carregar os dados", latest: "Última atualização de BoP", version: "Versão",
    see_changes: "Ver todas as alterações", no_change: "sem alterações", search_car: "Procurar carro ou marca…", search_track: "Procurar pista…",
    track_type: "Tipo de pista", set_h: "Rápida", set_m: "Média", set_l: "Lenta",
    set_h_long: "Pistas rápidas", set_m_long: "Pistas médias", set_l_long: "Pistas lentas",
    col_car: "Carro", col_pp: "PP", col_best: "Melhor em", col_last: "Última alteração", col_traits: "Características", col_tier: "Tier",
    rank_note: "Posição = PP com o BoP do tipo de pista escolhido. Tiers: S top 10 %, A ≤35 %, B ≤70 %, C resto.",
    no_match: "Nenhum carro encontrado.", find_car: "Que carro para que pista?", find_car_sub: "Escolhe a pista e a classe para ver os melhores carros, com base em tempos reais das leaderboards.",
    pick_track: "Escolhe uma pista", go: "Ver carros", tyres: "Pneus", fuel: "Combustível", tyre_wear: "Desgaste de pneus", fuel_use: "Consumo",
    buff: "melhorado", nerf: "penalizado", mixed: "misto", unchanged: "sem alteração", first_seen: "estreia",
    pp_only: "só PP", bop_of: (s) => `BoP ${s.toLowerCase()}`,
    updates_title: "Atualizações de BoP", updates_sub: "Todas as versões do jogo que mudaram potência ou peso de um carro Gr.1–4.",
    cars_changed: (n) => `${n} carros alterados`, update_note: "Veredito = variação média da relação potência/peso nos conjuntos de BoP alterados: melhorado > +0,25 %, penalizado < −0,25 %, senão misto.",
    col_verdict: "Veredito", col_pw: "Potência / peso", col_dpp: "ΔPP", col_rank: "Posição", col_context: "Contexto após a atualização",
    back_rank: (g) => `← Rankings ${g}`, ctx_title: (v, d) => `Performance na ${v} (${d})`, ctx_hint: "Escolhe uma linha em “Alterações de BoP” para ver uma versão anterior",
    track_fit: "Adequação à pista", strengths: "Pontos fortes", weaknesses: "Pontos fracos", none: "nada se destaca", estimates: "Estimativas relativas à classe (peso, binário, tração, potência).",
    specs: "Especificações (BoP de pista média)", power: "Potência", weight: "Peso", balance: "Distribuição F:T", handling: "Comportamento", notes: "Notas",
    history: "Histórico", bop_changes: "Alterações de BoP", col_version: "Versão", col_date: "Data",
    track_record: "Registo nas leaderboards", track_record_sub: "Resultados das Daily Races com este carro (top 1000 voltas por evento).", gap: "Diferença", events: "Eventos",
    tracks_title: "Pistas", tracks_sub: "Escolhe um traçado para ver que carros são mais rápidos lá.", with_data: (n) => `${n} eventos com leaderboard`, no_data: "só estimativa do modelo",
    track_cars: "Melhores carros", score: "Pontuação", evidence: "Base", ev_lb: "Leaderboard", ev_model: "Estimativa",
    gap_note: "Diferença = mediana das 20 melhores voltas do carro vs. as 20 voltas mais rápidas do evento (top 1000). Eventos antigos ou anteriores à última alteração de BoP do carro contam menos.",
    top100: "no top 100", race_events: "Eventos Daily Race", no_events: "Ainda não houve Daily Race desta classe aqui — o ranking é a estimativa do modelo para este tipo de pista.",
    low: "baixo", medium: "médio", high: "alto", neutral: "neutro", understeer: "subviragem", oversteer: "sobreviragem",
    footer_est: "desgaste de pneus e consumo são estimativas", unofficial: "sem ligação à Polyphony Digital",
    tr: { "straight-line speed": "velocidade em reta", acceleration: "aceleração", "low-speed cornering": "curvas lentas", "high-speed cornering": "curvas rápidas" },
    summary(b) {
      const p = [];
      const d = b.delta || {};
      if (b.changed && (d.power_ps || d.weight_kg)) {
        const bits = [d.power_ps && `${d.power_ps > 0 ? "+" : ""}${d.power_ps} PS`, d.weight_kg && `${d.weight_kg > 0 ? "+" : ""}${d.weight_kg} kg`].filter(Boolean);
        p.push(`${cap(this[b.verdict] || b.verdict)} (${bits.join(", ")}).`);
      }
      const set = this["set_" + b.best_set + "_long"].toLowerCase();
      p.push(`${b.rank}.º de ${b.of} (tier ${b.tier}), ${b.all_rounder ? `polivalente, com ligeira vantagem em ${set}` : `mais forte em ${set}`}.`);
      if (b.strengths.length) p.push(`Bom em ${b.strengths.map((s) => this.tr[s]).join(", ")}.`);
      p.push(`Desgaste de pneus estimado ${this[b.tyre_wear]}, consumo ${this[b.fuel_use]}.`);
      return p.join(" ");
    },
    about: `<h1>Sobre</h1>
      <p>Acompanha o <b>Balance of Performance</b> do Gran Turismo 7 para Gr.1–Gr.4. Desde a 1.19 o jogo usa três conjuntos de BoP — pistas rápidas, médias e lentas — escolhidos pela pista.</p>
      <h2>Como os carros são avaliados</h2><ul>
      <li><b>Posição / tier</b>: PP dentro da classe em cada conjunto de BoP.</li>
      <li><b>Veredito</b>: variação da relação potência/peso face à versão anterior.</li>
      <li><b>Adequação à pista</b>: metade posição em PP, metade as características que cada tipo de pista premeia (reta, curvas a 60/120/240 km/h, aceleração).</li>
      <li><b>Avaliação por pista</b>: 70 % ritmo real nas leaderboards das Daily Races nesse traçado (top 1000 voltas por evento; eventos recentes e posteriores à última alteração de BoP do carro pesam mais) + 30 % modelo. Sem dados de leaderboard, é a estimativa do modelo.</li>
      <li><b>Pneus e combustível</b>: estimativas heurísticas — ainda não medidas. Os valores reais virão do <a href="https://github.com/francmarra">gt7-telemetry</a>.</li></ul>`,
  },
};
let lang = "en";
try { lang = localStorage.getItem("lang") || (navigator.language.startsWith("pt") ? "pt" : "en"); } catch { /* storage blocked */ }
const t = (k, ...a) => { const v = I18N[lang][k] ?? I18N.en[k] ?? k; return typeof v === "function" ? v(...a) : v; };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const summary = (b) => (b ? I18N[lang].summary(b) : "");

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const num = (v, d = 0) => (typeof v === "number" ? v.toFixed(d) : "—");
const load = (path) => (cache[path] ??= fetch("data/" + path).then((r) => { if (!r.ok) throw new Error(path); return r.json(); }));
const verdict = (v) => (v ? `<span class="v ${v}">${t(v)}</span>` : `<span class="muted">—</span>`);
const tierBadge = (x) => `<span class="tier ${x}" title="${t("col_tier")} ${x}">${x}</span>`;
const setBadge = (s) => `<span class="set ${s}" title="${t("set_" + s + "_long")}">${t("set_" + s)}</span>`;
const signed = (n, unit = "", goodIfNegative = false) => {
  if (typeof n !== "number") return "";
  const good = goodIfNegative ? n < 0 : n > 0;
  return `<span class="${good ? "pos" : "neg"}">${n > 0 ? "+" : ""}${n}${unit}</span>`;
};
const deltaText = (d = {}) => ([signed(d.power_ps, " PS"), signed(d.weight_kg, " kg", true)].filter(Boolean).join(" ") || `<span class="muted">${t("pp_only")}</span>`) + (d.set ? ` <span class="muted">(${t("bop_of", t("set_" + d.set))})</span>` : "");
const level = (l) => `<span class="lvl ${l}">${t(l)}</span>`;
const groupLabel = (id) => index.groups.find((g) => g.id === id)?.label ?? id;
const carById = (id) => index.groups.flatMap((g) => g.cars).find((c) => c.id === id);
const rowLinks = (root) => root.querySelectorAll("[data-href]").forEach((el) => (el.onclick = () => (location.hash = el.dataset.href)));

function chrome() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  document.querySelectorAll(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
}
document.querySelector(".lang").onclick = (e) => {
  const l = e.target.dataset.lang;
  if (!l || l === lang) return;
  lang = l;
  try { localStorage.setItem("lang", l); } catch { /* ignore */ }
  route();
};

async function route() {
  const [page, a, b] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  chrome();
  document.querySelectorAll("nav a").forEach((x) => x.classList.toggle("on", x.dataset.page === (page || "rankings") || (page === "track" && x.dataset.page === "tracks") || (page === "update" && x.dataset.page === "updates")));
  window.scrollTo(0, 0);
  try {
    index ??= await load("index.json");
    if (page === "car") await carPage(a);
    else if (page === "tracks") await tracksPage();
    else if (page === "track") await trackPage(a, b);
    else if (page === "update") await updatePage(a);
    else if (page === "updates") updatesPage();
    else if (page === "about") app.innerHTML = `<section class="panel prose">${t("about")}<p class="muted">${esc(index.generated)} · <a href="https://gt-engine.com/gt7/">GT ENG!NE</a> · <a href="https://gtsh-rank.com/daily/">gtsh-rank</a> · <a href="https://github.com/ddm999/gt7info">gt7info</a></p></section>`;
    else await homePage();
  } catch (e) {
    app.innerHTML = `<div class="panel">${t("load_error")} (${esc(e.message)}).</div>`;
  }
}

/* ---------- shared pieces ---------- */
function trackPicker(selected = "", group = state.group) {
  const opts = tracks.map((x) => `<option value="${x.id}" ${x.id === selected ? "selected" : ""}>${esc(x.name)}${x.groups[group]?.events.length ? " ★" : ""}</option>`).join("");
  return `<form class="picker" id="picker">
    <select id="pk-track" aria-label="${t("pick_track")}"><option value="">${t("pick_track")}</option>${opts}</select>
    <div class="seg" id="pk-group">${index.groups.map((g) => `<button type="button" class="${g.id === group ? "on" : ""}" data-g="${g.id}">${g.label}</button>`).join("")}</div>
    <button class="btn" type="submit">${t("go")} →</button></form>`;
}
function bindPicker(group = state.group) {
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
const traits = (b) => b ? `<div class="chips">${b.strengths.map((s) => `<span>${esc(I18N[lang].tr[s])}</span>`).join("")}<span class="soft">🛞 ${t(b.tyre_wear)}</span><span class="soft">⛽ ${t(b.fuel_use)}</span></div>` : "";

/* ---------- home ---------- */
async function homePage() {
  tracks ??= await load("tracks.json");
  const u = index.updates[0];
  const counts = index.groups.map((g) => {
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
        <div class="seg" id="groups">${index.groups.map((g) => `<button class="${g.id === state.group ? "on" : ""}" data-g="${g.id}">${g.label} <small>${g.cars.length}</small></button>`).join("")}</div>
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
  const g = index.groups.find((x) => x.id === state.group);
  const q = state.q.toLowerCase();
  const rows = g.cars
    .filter((c) => !q || (c.name + " " + c.maker).toLowerCase().includes(q))
    .sort((a, b) => a.sets[state.set].rank - b.sets[state.set].rank)
    .map((c) => {
      const s = c.sets[state.set], lc = c.last_change;
      return `<div class="row" data-href="#/car/${c.id}">
        <span class="rk mono">${s.rank}</span>${tierBadge(s.tier)}
        <span class="nm"><b>${esc(c.name)}</b><small>${esc(c.maker)} · ${esc(c.drivetrain)}</small></span>
        <span class="pp mono">${num(s.pp, 2)}</span>
        <span class="bs">${setBadge(c.best_set)}</span>
        <span class="lc">${lc ? `${verdict(lc.verdict)} <small class="mono">${lc.v}</small>` : "—"}</span>
        <span class="tr">${traits(c.brief)}</span></div>`;
    }).join("");
  const el = app.querySelector("#ranking");
  el.innerHTML = `<div class="rows"><div class="row head"><span class="rk">#</span><span>${t("col_tier")}</span><span class="nm">${t("col_car")}</span><span class="pp">${t("col_pp")}</span><span class="bs">${t("col_best")}</span><span class="lc">${t("col_last")}</span><span class="tr">${t("col_traits")}</span></div>${rows || `<p class="muted pad">${t("no_match")}</p>`}</div>`;
  rowLinks(el);
}

/* ---------- tracks ---------- */
async function tracksPage() {
  tracks ??= await load("tracks.json");
  const render = () => {
    const q = state.tq.toLowerCase();
    const cols = ["h", "m", "l"].map((s) => {
      const list = tracks.filter((x) => x.set === s && (!q || x.name.toLowerCase().includes(q)));
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

async function trackPage(id, group) {
  tracks ??= await load("tracks.json");
  const tr = tracks.find((x) => x.id === id);
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

/* ---------- updates ---------- */
function updatesPage() {
  app.innerHTML = `<h1>${t("updates_title")}</h1><p class="muted">${t("updates_sub")}</p>
    <div class="panel updates">${index.updates.map((u) => `
      <a href="#/update/${u.version}"><b class="mono">${esc(u.version)}</b><span class="muted mono">${esc(u.date)}</span>
      <span>${Object.entries(u.counts).map(([g, c]) => `<span class="ug"><b>${groupLabel(g)}</b> <span class="v buff">▲${c.buff}</span> <span class="v nerf">▼${c.nerf}</span>${c.mixed ? ` <span class="v mixed">◆${c.mixed}</span>` : ""}</span>`).join("")}</span></a>`).join("")}
    </div>`;
}

async function updatePage(v) {
  const u = await load(`updates/${v}.json`);
  const i = index.updates.findIndex((x) => x.version === v);
  const prev = index.updates[i + 1], next = index.updates[i - 1];
  const order = { buff: 0, mixed: 1, nerf: 2 };
  const sections = index.groups.filter((g) => u.groups[g.id]).map((g) => {
    const rows = u.groups[g.id].sort((a, b) => order[a.verdict] - order[b.verdict] || a.rank - b.rank).map((c) => `
      <div class="row urow" data-href="#/car/${c.id}"><span>${verdict(c.verdict)}</span><span class="nm"><b>${esc(c.name)}</b></span>
      <span class="mono">${deltaText(c.delta)}</span><span class="mono">${signed(c.delta.pp)}</span><span class="mono">${c.rank}</span>
      <span class="sm muted">${esc(summary(c.brief))}</span></div>`).join("");
    return `<section class="panel"><h2>${g.label} <span class="muted small">${t("cars_changed", u.groups[g.id].length)}</span></h2>
      <div class="rows"><div class="row urow head"><span>${t("col_verdict")}</span><span class="nm">${t("col_car")}</span><span>${t("col_pw")}</span><span>${t("col_dpp")}</span><span>${t("col_rank")}</span><span class="sm">${t("col_context")}</span></div>${rows}</div></section>`;
  }).join("");
  app.innerHTML = `
    <div class="toolbar between">
      <div><h3>BoP</h3><h1>${t("version")} ${esc(u.version)} <span class="muted mono small">${esc(u.date)}</span></h1></div>
      <div class="seg">${prev ? `<a href="#/update/${prev.version}">← ${prev.version}</a>` : ""}${next ? `<a href="#/update/${next.version}">${next.version} →</a>` : ""}</div>
    </div><p class="muted">${t("update_note")}</p>${sections}`;
  rowLinks(app);
}

/* ---------- car ---------- */
async function carPage(id) {
  const car = await load(`cars/${id}.json`);
  const hist = car.history;
  const changes = hist.filter((e, i) => e.changed || i === 0);
  let selected = hist.length - 1;
  const record = (car.tracks || []).map((r) => `<div class="row rrow" data-href="#/track/${r.id}/${car.group}">
    <span class="nm"><b>${esc(r.name)}</b></span>${setBadge(r.set)}<span class="mono">${r.rank}/${r.of}</span>${tierBadge(r.tier)}
    <span class="mono">+${num(r.gap_pct, 2)} %</span><span class="mono muted">${r.events}</span></div>`).join("");

  app.innerHTML = `
    <p><a href="#/" class="muted">${t("back_rank", groupLabel(car.group))}</a></p>
    <section class="panel">
      <div class="toolbar between"><div><h3>${groupLabel(car.group)} · ${esc(car.maker)} · ${esc(car.drivetrain)}</h3><h1>${esc(car.name)}</h1></div><div id="now" class="now"></div></div>
      <p id="summary" class="lead"></p>
    </section>
    <section class="panel"><div class="toolbar between"><h2 id="ctx-title"></h2><span class="muted small">${t("ctx_hint")}</span></div>
      <div class="grid" id="cards"></div>
      ${car.notes?.text ? `<div class="card" style="margin-top:12px"><h3>${t("notes")}</h3><p>${esc(car.notes.text)}</p></div>` : ""}
    </section>
    ${record ? `<section class="panel"><h2>${t("track_record")}</h2><p class="muted small">${t("track_record_sub")}</p>
      <div class="rows"><div class="row rrow head"><span class="nm">${t("nav_tracks")}</span><span>${t("track_type")}</span><span>${t("col_rank")}</span><span>${t("col_tier")}</span><span>${t("gap")}</span><span>${t("events")}</span></div>${record}</div></section>` : ""}
    <section class="panel"><div class="toolbar between"><h2>${t("history")}</h2>
      <div class="seg" id="metric">${[["pp", "PP"], ["ps_per_t", "PS/t"], ["power_ps", t("power")], ["weight_kg", t("weight")]].map(([k, l], i) => `<button class="${i ? "" : "on"}" data-k="${k}">${l}</button>`).join("")}</div></div>
      <div id="chart"></div>
      <div class="legend">${["h", "m", "l"].map((s) => `<span><i style="background:var(--${s})"></i>${t("set_" + s + "_long")}</span>`).join("")}</div>
    </section>
    <section class="panel"><h2>${t("bop_changes")}</h2>
      <div class="rows" id="changes"><div class="row crow head"><span>${t("col_version")}</span><span>${t("col_date")}</span><span>${t("col_verdict")}</span><span>${t("col_pw")}</span><span>PP</span><span>${t("col_rank")}</span></div>
      ${changes.slice().reverse().map((e) => `
        <div class="row crow" data-i="${hist.indexOf(e)}"><span class="mono">${esc(e.v)}</span><span class="muted mono">${esc(e.date)}</span>
        <span>${e.verdict ? verdict(e.verdict) : `<span class="muted">${t("first_seen")}</span>`}</span><span class="mono">${e.delta ? deltaText(e.delta) : ""}</span>
        <span class="mono">${num(e.sets.m.pp, 2)}</span><span class="mono">${e.sets.m.rank}/${e.of} ${tierBadge(e.sets.m.tier)}</span></div>`).join("")}
      </div></section>`;
  rowLinks(app);

  const brief = (e) => ({ verdict: e.verdict, changed: e.changed, delta: e.delta, of: e.of, rank: e.sets[e.context.best_set].rank, tier: e.sets[e.context.best_set].tier, ...e.context });
  const renderCtx = () => {
    const e = hist[selected], c = e.context, m = e.sets.m;
    app.querySelector("#now").innerHTML = `${tierBadge(m.tier)} <span class="mono">#${m.rank}/${e.of}</span>`;
    app.querySelector("#ctx-title").textContent = t("ctx_title", e.v, e.date);
    app.querySelector("#summary").textContent = summary(brief(e));
    const fit = ["h", "m", "l"].map((s) => `<div class="fit">${setBadge(s)} <span class="muted mono">#${e.sets[s].rank}</span>
      <div class="bar"><i style="width:${Math.round(c.fit[s] * 100)}%;background:var(--${s})"></i></div></div>`).join("");
    const hand = (f) => t({ N: "neutral", U: "understeer", O: "oversteer" }[f] || "—");
    app.querySelector("#cards").innerHTML = `
      <div class="card"><h3>${t("track_fit")}</h3>${fit}<div class="note">${c.tracks.map(esc).join(", ")}</div></div>
      <div class="card"><h3>${t("strengths")}</h3><div class="chips">${c.strengths.map((s) => `<span>${esc(I18N[lang].tr[s])}</span>`).join("") || `<span class="soft">${t("none")}</span>`}</div>
        <h3 class="mt">${t("weaknesses")}</h3><div class="chips">${c.weaknesses.map((s) => `<span class="weak">${esc(I18N[lang].tr[s])}</span>`).join("") || `<span class="soft">${t("none")}</span>`}</div></div>
      <div class="card"><h3>${t("tyre_wear")}</h3>${level(c.tyre_wear)}<h3 class="mt">${t("fuel_use")}</h3>${level(c.fuel_use)}<div class="note">${t("estimates")}</div></div>
      <div class="card"><h3>${t("specs")}</h3><dl class="specs">
        <dt>${t("power")}</dt><dd>${num(m.power_ps)} PS</dd><dt>${t("weight")}</dt><dd>${num(m.weight_kg)} kg</dd>
        <dt>PS/t</dt><dd>${num(m.ps_per_t, 1)}</dd><dt>${t("balance")}</dt><dd>${esc(m.balance ?? "—")}</dd>
        <dt>${t("handling")}</dt><dd>${hand(c.handling.low)} / ${hand(c.handling.high)}</dd></dl></div>`;
    app.querySelectorAll("#changes [data-i]").forEach((r) => r.classList.toggle("sel", +r.dataset.i === selected));
  };
  app.querySelector("#changes").onclick = (ev) => { const r = ev.target.closest("[data-i]"); if (r) { selected = +r.dataset.i; renderCtx(); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  app.querySelector("#metric").onclick = (ev) => {
    const k = ev.target.dataset.k; if (!k) return;
    app.querySelectorAll("#metric button").forEach((b) => b.classList.toggle("on", b === ev.target));
    app.querySelector("#chart").innerHTML = chart(hist, k);
  };
  app.querySelector("#chart").innerHTML = chart(hist, "pp");
  renderCtx();
}

function chart(hist, key) {
  const W = 1000, H = 240, P = { l: 56, r: 12, t: 12, b: 28 };
  const vals = hist.flatMap((e) => ["h", "m", "l"].map((s) => e.sets[s][key])).filter((v) => typeof v === "number");
  if (!vals.length) return '<p class="muted">—</p>';
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const x = (i) => P.l + (i / Math.max(1, hist.length - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const lines = ["l", "m", "h"].map((s) => {
    let d = "";
    hist.forEach((e, i) => { const v = e.sets[s][key]; if (typeof v !== "number") return; d += d ? ` H${x(i)} V${y(v)}` : `M${x(i)} ${y(v)}`; });
    return `<path d="${d}" fill="none" stroke="var(--${s})" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  }).join("");
  const ticks = [0, 0.5, 1].map((f) => { const v = lo + f * (hi - lo); return `<text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(key === "pp" ? 1 : 0)}</text><line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>`; }).join("");
  const step = Math.ceil(hist.length / 8);
  const xl = hist.map((e, i) => (i % step === 0 || i === hist.length - 1 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(e.v)}</text>` : "")).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(key)}">${ticks}${lines}${xl}</svg>`;
}

window.addEventListener("hashchange", route);
route();
