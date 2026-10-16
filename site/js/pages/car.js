import { t, I18N, lang, summary, cap } from "../i18n.js";
import { esc, num, signed, info } from "../format.js";
import { load, store, state, groupLabel as gl } from "../data.js";
import { app, verdict, tierBadge, setBadge, deltaText, level, traits } from "../ui.js";
const groupLabel = (id) => gl(store.index, id);

export async function carPage(id) {
  const car = await load(`cars/${id}.json`);
  const hist = car.history;
  const changes = hist.filter((e, i) => e.changed || i === 0);
  let selected = hist.length - 1;
  const first = hist[0].sets.m.pp, last = hist[hist.length - 1].sets.m.pp;
  const changeRows = changes.slice().reverse().map((e) => `
        <button type="button" class="row crow" data-i="${hist.indexOf(e)}"><span class="mono">${esc(e.v)}</span><span class="muted mono">${esc(e.date)}</span>
        <span>${e.verdict ? verdict(e.verdict) : `<span class="muted">${t("first_seen")}</span>`}</span><span class="mono">${e.delta ? deltaText(e.delta) : ""}</span>
        <span class="mono">${num(e.sets.m.pp, 2)}</span><span class="mono">${e.sets.m.rank}/${e.of} ${tierBadge(e.sets.m.tier)}</span></button>`).join("");

  app.innerHTML = `
    <p><a href="#/" class="link-more">${t("back_rank", groupLabel(car.group))}</a></p>
    <section class="panel">
      <div class="toolbar between"><div><h3>${groupLabel(car.group)} · ${esc(car.maker)} · ${esc(car.drivetrain)}</h3><h1>${esc(car.name)}</h1></div><div id="now" class="now"></div></div>
      <p id="summary" class="lead"></p>
    </section>
    <section class="panel"><div class="toolbar between"><h2>${t("history")}</h2>
      <div class="seg" id="metric" role="group" aria-label="${t("history")}">${[["pp", "PP"], ["ps_per_t", "PS/t"], ["power_ps", t("power")], ["weight_kg", t("weight")]].map(([k, l], i) => `<button type="button" class="${i ? "" : "on"}" aria-pressed="${!i}" data-k="${k}">${l}</button>`).join("")}</div></div>
      <div id="chart"></div>
      <p class="muted small">${t("chart_alt", num(first, 2), num(last, 2), hist.length)}</p>
      <div class="legend">${["h", "m", "l"].map((s) => `<span><i style="background:var(--${s})"></i>${t("set_" + s + "_long")}</span>`).join("")}</div>
      <h2 class="mt">${t("bop_changes")}</h2>
      ${changes.length > 1 ? `<p class="muted small">${t("ctx_hint")}</p>
      <div class="rows" id="changes"><div class="row crow head"><span>${t("col_version")}</span><span>${t("col_date")}</span><span>${t("col_verdict")}</span><span>${t("col_pw")}</span><span>PP</span><span>${t("col_rank")}</span></div>
      ${changeRows}
      </div>` : `<p id="changes">${t("no_changes", esc(hist[0].v))}</p>`}
    </section>
    <section class="panel" id="details"><h2 id="ctx-title"></h2>
      <div class="grid" id="cards"></div>
      ${car.notes?.text ? `<div class="card" style="margin-top:12px"><h3>${t("notes")}</h3><p>${esc(car.notes.text)}</p></div>` : ""}
    </section>`;

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
      <div class="card"><h3>${t("track_fit")} ${info("track_types", t)}</h3>${fit}<div class="note">${c.tracks.map(esc).join(", ")}</div></div>
      <div class="card"><h3>${t("strengths")}</h3><div class="chips">${c.strengths.map((s) => `<span>${esc(I18N[lang].tr[s])}</span>`).join("") || `<span class="soft">${t("none")}</span>`}</div>
        <h3 class="mt">${t("weaknesses")}</h3><div class="chips">${c.weaknesses.map((s) => `<span class="weak">${esc(I18N[lang].tr[s])}</span>`).join("") || `<span class="soft">${t("none")}</span>`}</div></div>
      <div class="card"><h3>${t("tyre_wear")} ${info("estimates", t)}</h3>${level(c.tyre_wear)}<h3 class="mt">${t("fuel_use")}</h3>${level(c.fuel_use)}<div class="note">${t("estimates")}</div></div>
      <div class="card"><h3>${t("specs")}</h3><dl class="specs">
        <dt>${t("power")}</dt><dd>${num(m.power_ps)} PS</dd><dt>${t("weight")}</dt><dd>${num(m.weight_kg)} kg</dd>
        <dt>PS/t ${info("ps_t", t)}</dt><dd>${num(m.ps_per_t, 1)}</dd><dt>${t("balance")} ${info("balance", t)}</dt><dd>${esc(m.balance ?? "—")}</dd>
        <dt>${t("handling")}</dt><dd>${hand(c.handling.low)} / ${hand(c.handling.high)}</dd></dl></div>`;
    app.querySelectorAll("#changes [data-i]").forEach((r) => r.classList.toggle("sel", +r.dataset.i === selected));
  };
  app.querySelector("#changes").onclick = (ev) => { const r = ev.target.closest("[data-i]"); if (r) { selected = +r.dataset.i; renderCtx(); app.querySelector("#details").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } };
  app.querySelector("#metric").onclick = (ev) => {
    const k = ev.target.dataset.k; if (!k) return;
    app.querySelectorAll("#metric button").forEach((b) => { b.classList.toggle("on", b === ev.target); b.setAttribute("aria-pressed", String(b === ev.target)); });
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
