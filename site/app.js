"use strict";
const app = document.getElementById("app");
const SET_NAME = { h: "High-speed", m: "Mid-speed", l: "Low-speed" };
const HANDLING = { N: "neutral", U: "understeer", O: "oversteer" };
const cache = {};
let index = null;
const state = { group: "gr3", set: "m", q: "" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const load = (path) => (cache[path] ??= fetch("data/" + path).then((r) => { if (!r.ok) throw new Error(path); return r.json(); }));
const verdict = (v) => (v ? `<span class="v ${v}">${v}</span>` : `<span class="muted">—</span>`);
const tierBadge = (t) => `<span class="tier ${t}">${t}</span>`;
const setBadge = (s) => `<span class="set ${s}" title="${SET_NAME[s]} BoP">${s.toUpperCase()}</span>`;
const signed = (n, unit = "", goodIfNegative = false) => {
  if (n === undefined || n === null) return "";
  const good = goodIfNegative ? n < 0 : n > 0;
  return `<span class="${good ? "pos" : "neg"}">${n > 0 ? "+" : ""}${n}${unit}</span>`;
};
const deltaText = (d = {}) => ([signed(d.power_ps, " PS"), signed(d.weight_kg, " kg", true)].filter(Boolean).join(" ") || '<span class="muted">PP only</span>') + (d.set ? ` <span class="muted">(${SET_NAME[d.set]} BoP)</span>` : "");

function setNav(route) {
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#/" + route));
}

async function route() {
  const [page, arg] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  setNav(page || "");
  window.scrollTo(0, 0);
  try {
    index ??= await load("index.json");
    if (page === "car") await carPage(arg);
    else if (page === "update") await updatePage(arg);
    else if (page === "updates") updatesPage();
    else if (page === "about") aboutPage();
    else homePage();
  } catch (e) {
    app.innerHTML = `<div class="panel">Could not load data (${esc(e.message)}).</div>`;
  }
}

/* ---------- home: latest update + group rankings ---------- */
function homePage() {
  const u = index.updates[0];
  const counts = index.groups.map((g) => {
    const c = u.counts[g.id];
    const txt = c ? `<span class="v buff">${c.buff}▲</span> <span class="v nerf">${c.nerf}▼</span> <span class="v mixed">${c.mixed}◆</span>` : '<span class="muted">no change</span>';
    return `<a class="count" href="#/update/${u.version}"><b>${g.label}</b>${txt}</a>`;
  }).join("");
  app.innerHTML = `
    <section class="panel hero">
      <div>
        <h3>Latest BoP update</h3>
        <h1>Version ${esc(u.version)} <span class="muted mono" style="font-size:18px">${esc(u.date)}</span></h1>
        <div class="counts">${counts}</div>
      </div>
      <a class="tab on" href="#/update/${u.version}" style="text-decoration:none">See all changes →</a>
    </section>
    <section class="panel">
      <div class="toolbar">
        <div class="tabs" id="groups">${index.groups.map((g) => `<button class="tab ${g.id === state.group ? "on" : ""}" data-g="${g.id}">${g.label}</button>`).join("")}</div>
        <div class="tabs" id="sets">${["h", "m", "l"].map((s) => `<button class="tab ${s === state.set ? "on" : ""}" data-s="${s}">${SET_NAME[s]}</button>`).join("")}</div>
        <input type="search" id="q" placeholder="Search car or maker…" value="${esc(state.q)}">
      </div>
      <div class="table-wrap" id="ranking"></div>
      <p class="note">Rank = PP under the selected BoP set (higher PP ≈ faster). Tier: S top 10 %, A ≤35 %, B ≤70 %, C rest.</p>
    </section>`;
  app.querySelector("#groups").onclick = (e) => { if (e.target.dataset.g) { state.group = e.target.dataset.g; homePage(); } };
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
      const s = c.sets[state.set];
      const lc = c.last_change;
      return `<tr class="link" data-id="${c.id}">
        <td class="num">${s.rank}</td><td>${tierBadge(s.tier)}</td>
        <td><b>${esc(c.name)}</b><div class="muted" style="font-size:13px">${esc(c.maker)} · ${esc(c.drivetrain)}</div></td>
        <td class="num">${s.pp?.toFixed(2) ?? "—"}</td>
        <td>${setBadge(c.best_set)}</td>
        <td>${lc ? `${verdict(lc.verdict)} <span class="muted mono">${lc.v}</span>` : "—"}</td>
        <td class="wrap"><div class="clamp">${esc(c.summary)}</div></td></tr>`;
    }).join("");
  const el = app.querySelector("#ranking");
  el.innerHTML = `<table><thead><tr><th class="num">#</th><th>Tier</th><th>Car</th><th class="num">PP</th><th>Best on</th><th>Last change</th><th>Context</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted">No cars match.</td></tr>'}</tbody></table>`;
  el.onclick = (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) location.hash = "#/car/" + tr.dataset.id; };
}

/* ---------- updates timeline ---------- */
function updatesPage() {
  const label = Object.fromEntries(index.groups.map((g) => [g.id, g.label]));
  app.innerHTML = `<h1>BoP updates</h1><p class="muted">Every game version that changed power or weight of a Gr.1–4 car.</p>
    <div class="panel updates">${index.updates.map((u) => `
      <a href="#/update/${u.version}"><b class="mono">${esc(u.version)}</b><span class="muted mono">${esc(u.date)}</span>
      <span>${Object.entries(u.counts).map(([g, c]) => `<b>${label[g]}</b> <span class="v buff">${c.buff}▲</span> <span class="v nerf">${c.nerf}▼</span>${c.mixed ? ` <span class="v mixed">${c.mixed}◆</span>` : ""}`).join(" &nbsp;·&nbsp; ")}</span></a>`).join("")}
    </div>`;
}

async function updatePage(v) {
  const u = await load(`updates/${v}.json`);
  const i = index.updates.findIndex((x) => x.version === v);
  const prev = index.updates[i + 1], next = index.updates[i - 1];
  const order = { buff: 0, mixed: 1, nerf: 2 };
  const sections = index.groups.filter((g) => u.groups[g.id]).map((g) => {
    const rows = u.groups[g.id].sort((a, b) => order[a.verdict] - order[b.verdict] || a.rank - b.rank).map((c) => `
      <tr class="link" data-id="${c.id}"><td>${verdict(c.verdict)}</td><td><b>${esc(c.name)}</b></td>
      <td class="mono">${deltaText(c.delta)}</td><td class="num">${signed(c.delta.pp)}</td><td class="num">${c.rank}</td>
      <td class="wrap"><div class="clamp">${esc(c.summary)}</div></td></tr>`).join("");
    return `<section class="panel"><h2>${g.label} <span class="muted" style="font-size:16px">${u.groups[g.id].length} cars changed</span></h2>
      <div class="table-wrap"><table><thead><tr><th>Verdict</th><th>Car</th><th>Power / weight</th><th class="num">ΔPP</th><th class="num">Rank</th><th>Context after update</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }).join("");
  app.innerHTML = `
    <div class="toolbar" style="justify-content:space-between">
      <div><h3>BoP update</h3><h1>Version ${esc(u.version)} <span class="muted mono" style="font-size:18px">${esc(u.date)}</span></h1></div>
      <div class="tabs">${prev ? `<a class="tab" href="#/update/${prev.version}">← ${prev.version}</a>` : ""}${next ? `<a class="tab" href="#/update/${next.version}">${next.version} →</a>` : ""}</div>
    </div>
    <p class="muted">Verdict compares power-to-weight under the mid-speed BoP: buff &gt; +0.25 %, nerf &lt; −0.25 %, otherwise mixed. Rank is within the group after the update.</p>
    ${sections}`;
  app.querySelectorAll("tbody").forEach((tb) => (tb.onclick = (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) location.hash = "#/car/" + tr.dataset.id; }));
}

/* ---------- car page ---------- */
async function carPage(id) {
  const car = await load(`cars/${id}.json`);
  const label = index.groups.find((g) => g.id === car.group)?.label ?? car.group;
  const hist = car.history;
  const changes = hist.filter((e, i) => e.changed || i === 0);
  let selected = hist.length - 1;

  app.innerHTML = `
    <p><a href="#/" class="muted">← ${label} rankings</a></p>
    <section class="panel hero">
      <div><h3>${label} · ${esc(car.maker)} · ${esc(car.drivetrain)}</h3><h1>${esc(car.name)}</h1></div>
      <div id="now"></div>
    </section>
    <section class="panel"><div class="toolbar" style="justify-content:space-between">
      <h2 id="ctx-title"></h2><span class="muted">Click a row below to see the context at that update</span></div>
      <p id="summary"></p><div class="grid" id="cards"></div>
      ${car.notes ? `<div class="card" style="margin-top:12px"><h3>Notes</h3><p>${esc(car.notes.text || "")}</p></div>` : ""}
    </section>
    <section class="panel"><div class="toolbar" style="justify-content:space-between"><h2>History</h2>
      <div class="tabs" id="metric">${[["pp", "PP"], ["ps_per_t", "PS/t"], ["power_ps", "Power"], ["weight_kg", "Weight"]].map(([k, l], i) => `<button class="tab ${i ? "" : "on"}" data-k="${k}">${l}</button>`).join("")}</div></div>
      <div id="chart"></div>
      <div class="legend">${["h", "m", "l"].map((s) => `<span><i style="background:var(--${s})"></i>${SET_NAME[s]}</span>`).join("")}</div>
    </section>
    <section class="panel"><h2>BoP changes</h2><div class="table-wrap"><table>
      <thead><tr><th>Version</th><th>Date</th><th>Verdict</th><th>Power / weight</th><th class="num">PP (M)</th><th class="num">Rank (M)</th><th>Tier</th></tr></thead>
      <tbody id="changes">${changes.slice().reverse().map((e) => `
        <tr class="link" data-i="${hist.indexOf(e)}"><td class="mono">${e.v}</td><td class="muted mono">${e.date}</td>
        <td>${e.verdict ? verdict(e.verdict) : '<span class="muted">first seen</span>'}</td><td class="mono">${e.delta ? deltaText(e.delta) : ""}</td>
        <td class="num">${e.sets.m.pp?.toFixed(2)}</td><td class="num">${e.sets.m.rank}/${e.of}</td><td>${tierBadge(e.sets.m.tier)}</td></tr>`).join("")}
      </tbody></table></div></section>`;

  const renderCtx = () => {
    const e = hist[selected], c = e.context, m = e.sets.m;
    app.querySelector("#now").innerHTML = `${tierBadge(m.tier)} <span class="mono">#${m.rank}/${e.of}</span>`;
    app.querySelector("#ctx-title").textContent = `Performance context · ${e.v} (${e.date})`;
    app.querySelector("#summary").textContent = e.summary;
    const fit = ["h", "m", "l"].map((s) => `<div>${setBadge(s)} ${SET_NAME[s]} <span class="muted mono">#${e.sets[s].rank}</span>
      <div class="bar"><i style="width:${Math.round(c.fit[s] * 100)}%;background:var(--${s})"></i></div></div>`).join("");
    app.querySelector("#cards").innerHTML = `
      <div class="card"><h3>Track fit</h3>${fit}<div class="note">Best: ${c.tracks.join(", ")}</div></div>
      <div class="card"><h3>Strengths</h3><div class="chips">${c.strengths.map((s) => `<span>${s}</span>`).join("") || '<span class="muted">none stand out</span>'}</div>
        <h3 style="margin-top:10px">Weaknesses</h3><div class="chips">${c.weaknesses.map((s) => `<span>${s}</span>`).join("") || '<span class="muted">none stand out</span>'}</div></div>
      <div class="card"><h3>Tyre wear</h3><div class="level ${c.tyre_wear}">${c.tyre_wear}</div>
        <h3 style="margin-top:10px">Fuel use</h3><div class="level ${c.fuel_use}">${c.fuel_use}</div>
        <div class="note">Estimates vs. the group (weight, torque, drivetrain, power).</div></div>
      <div class="card"><h3>Specs (mid-speed BoP)</h3><table class="mono" style="font-size:13px">
        <tr><td>Power</td><td class="num">${m.power_ps ?? "—"} PS</td></tr><tr><td>Weight</td><td class="num">${m.weight_kg ?? "—"} kg</td></tr>
        <tr><td>PS/t</td><td class="num">${m.ps_per_t ?? "—"}</td></tr><tr><td>Balance F:R</td><td class="num">${esc(m.balance ?? "—")}</td></tr>
        <tr><td>Handling</td><td class="num" style="font-size:12px">${HANDLING[c.handling.low] ?? "—"} / ${HANDLING[c.handling.high] ?? "—"}</td></tr></table></div>`;
    app.querySelectorAll("#changes tr").forEach((tr) => tr.classList.toggle("sel", +tr.dataset.i === selected));
  };
  app.querySelector("#changes").onclick = (ev) => { const tr = ev.target.closest("tr[data-i]"); if (tr) { selected = +tr.dataset.i; renderCtx(); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  app.querySelector("#metric").onclick = (ev) => {
    const k = ev.target.dataset.k; if (!k) return;
    app.querySelectorAll("#metric .tab").forEach((b) => b.classList.toggle("on", b === ev.target));
    app.querySelector("#chart").innerHTML = chart(hist, k);
  };
  app.querySelector("#chart").innerHTML = chart(hist, "pp");
  renderCtx();
}

function chart(hist, key) {
  const W = 1000, H = 240, P = { l: 56, r: 12, t: 12, b: 28 };
  const vals = hist.flatMap((e) => ["h", "m", "l"].map((s) => e.sets[s][key])).filter((v) => typeof v === "number");
  if (!vals.length) return '<p class="muted">No data.</p>';
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
  const xl = hist.map((e, i) => (i % step === 0 || i === hist.length - 1 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${e.v}</text>` : "")).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${key} history">${ticks}${lines}${xl}</svg>`;
}

/* ---------- about ---------- */
function aboutPage() {
  app.innerHTML = `<section class="panel"><h1>About</h1>
    <p>Tracks Gran Turismo 7 <b>Balance of Performance</b> for Gr.1–Gr.4 since version 1.15. Since 1.19 the game uses three BoP sets — high-, mid- and low-speed — picked by track.</p>
    <h2>How cars are assessed</h2><ul>
      <li><b>Rank / tier</b>: PP within the group under each BoP set.</li>
      <li><b>Verdict</b>: change in power-to-weight (mid-speed set) vs. the previous version.</li>
      <li><b>Track fit</b>: half PP rank, half the traits each track type rewards — straight-line speed and high-speed cornering (H), balance of both plus acceleration (M), low-speed cornering and acceleration (L).</li>
      <li><b>Strengths</b>: top / bottom quarter of the group in power-to-weight, 100–150 km/h acceleration and rotational G at 60 / 240 km/h.</li>
      <li><b>Tyre wear &amp; fuel</b>: heuristic estimates from weight, torque, drivetrain and power relative to the group — not measured. Real telemetry-based values will come from <a href="https://github.com/francmarra">gt7-telemetry</a>.</li>
    </ul>
    <p class="muted">Data generated ${esc(index.generated)} from <a href="https://gt-engine.com/gt7/">GT ENG!NE</a>; track classes from <a href="https://github.com/ddm999/gt7info">gt7info</a>. Unofficial fan project.</p></section>`;
}

window.addEventListener("hashchange", route);
route();
