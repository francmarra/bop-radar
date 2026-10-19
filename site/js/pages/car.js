import { t, I18N, lang, summary } from "../i18n.js";
import { BASE } from "../router.js";
import { html, num, info, sourceBadge } from "../format.js";
import { load, store, groupLabel as gl } from "../data.js";
import { app, verdict, tierBadge, setBadge, deltaText, level } from "../ui.js";
import { carImg } from "../carimg.js";
const groupLabel = (id) => gl(store.index, id);

export async function carPage(id) {
  const car = await load(`cars/${id}.json`);
  const hist = car.history;
  const changes = hist.filter((e, i) => e.changed || i === 0);
  let selected = hist.length - 1;
  const first = hist[0].sets.m.pp, last = hist[hist.length - 1].sets.m.pp;
  const changeRows = changes.slice().reverse().map((e) => html`
        <button type="button" class="row crow" data-i="${hist.indexOf(e)}"><span class="mono">${e.v}</span><span class="muted mono">${e.date}</span>
        <span>${e.verdict ? verdict(e.verdict) : html`<span class="muted">${t("first_seen")}</span>`}</span><span class="mono">${e.delta ? deltaText(e.delta) : ""}</span>
        <span class="mono">${num(e.sets.m.pp, 2)}</span><span class="mono">${e.sets.m.rank}/${e.of} ${tierBadge(e.sets.m.tier)}</span></button>`);

  app.innerHTML = html`
    <p><a href="${BASE}" class="link-more">${t("back_rank", groupLabel(car.group))}</a></p>
    <section class="panel car-hero">
      <div class="hero-txt"><p class="hero-meta">${groupLabel(car.group)} · ${car.maker} · ${car.drivetrain}</p><h1>${car.name}</h1><div id="now" class="now"></div></div>
      <div class="hero-pic">${carImg(id, "l", "", true)}</div>
      <p id="summary" class="lead"></p>
    </section>
    <section class="panel"><div class="toolbar between"><h2>${t("history")}</h2>
      <div class="seg" id="metric" role="group" aria-label="${t("history")}">${[["pp", "PP"], ["ps_per_t", "PS/t"], ["power_ps", t("power")], ["weight_kg", t("weight")]].map(([k, l], i) => html`<button type="button" class="${i ? "" : "on"}" aria-pressed="${!i}" data-k="${k}">${l}</button>`)}</div></div>
      <div id="chart"></div>
      <p class="muted small">${t("chart_alt", num(first, 2), num(last, 2), hist.length)}</p>
      <div class="legend">${["h", "m", "l"].map((s) => html`<span><i style="background:var(--${s})"></i>${t("set_" + s + "_long")}</span>`)}</div>
      <h2 class="mt">${t("bop_changes")}</h2>
      ${changes.length > 1 ? html`<p class="muted small">${t("ctx_hint")}</p>
      <div class="rows" id="changes"><div class="row crow head"><span>${t("col_version")}</span><span>${t("col_date")}</span><span>${t("col_verdict")}</span><span>${t("col_pw")}</span><span>PP</span><span>${t("col_pp_rank")}</span></div>
      ${changeRows}
      </div>` : html`<p id="changes">${t("no_changes", hist[0].v)}</p>`}
    </section>
    <section class="panel" id="details"><h2 id="ctx-title"></h2>
      <div class="grid" id="cards"></div>
      ${car.notes?.text ? html`<div class="card" style="margin-top:12px"><h3>${t("notes")}</h3><p>${car.notes.text}</p></div>` : ""}
    </section>`;

  // the current version uses the real-pace class ranking (car.now); older versions keep their PP ranks
  const latest = hist.length - 1;
  const now = car.now;
  const nowBest = now ? Object.keys(now).reduce((a, b) => (now[b].rank < now[a].rank ? b : a), "m") : null;
  const brief = (e, i) => {
    const b = { verdict: e.verdict, changed: e.changed, delta: e.delta, of: e.of, rank: e.sets[e.context.best_set].rank, tier: e.sets[e.context.best_set].tier, ...e.context };
    return i === latest && now ? { ...b, best_set: nowBest, rank: now[nowBest].rank, tier: now[nowBest].tier } : b;
  };
  const renderCtx = () => {
    const e = hist[selected], c = e.context, m = e.sets.m;
    const head = selected === latest && now ? now.m : m;
    app.querySelector("#now").innerHTML = html`<span class="tower ${head.tier}">${tierBadge(head.tier)}<b>P${head.rank}</b><span>/ ${e.of}</span></span> ${selected === latest ? sourceBadge(now?.m, t) : ""}`;
    app.querySelector("#ctx-title").textContent = t("ctx_title", e.v, e.date);
    app.querySelector("#summary").textContent = summary(brief(e, selected));
    const fit = ["h", "m", "l"].map((s) => html`<div class="fit">${setBadge(s)} <span class="muted mono">#${selected === latest && now ? now[s].rank : e.sets[s].rank}</span>
      <div class="bar"><i style="width:${Math.round(c.fit[s] * 100)}%;background:var(--${s})"></i></div></div>`);
    const hand = (f) => t({ N: "neutral", U: "understeer", O: "oversteer" }[f] || "—");
    app.querySelector("#cards").innerHTML = html`
      <div class="card"><h3>${t("track_fit")} ${info("track_types", t)}</h3>${fit}<div class="note">${c.tracks.join(", ")}</div></div>
      <div class="card"><h3>${t("strengths")}</h3><div class="chips">${c.strengths.length ? c.strengths.map((s) => html`<span>${I18N[lang].tr[s]}</span>`) : html`<span class="soft">${t("none")}</span>`}</div>
        <h3 class="mt">${t("weaknesses")}</h3><div class="chips">${c.weaknesses.length ? c.weaknesses.map((s) => html`<span class="weak">${I18N[lang].tr[s]}</span>`) : html`<span class="soft">${t("none")}</span>`}</div></div>
      <div class="card"><h3>${t("tyre_wear")} ${info("estimates", t)}</h3>${level(c.tyre_wear)}<h3 class="mt">${t("fuel_use")}</h3>${level(c.fuel_use)}<div class="note">${t("estimates")}</div></div>
      <div class="card"><h3>${t("specs")}</h3><dl class="specs">
        <dt>${t("power")}</dt><dd>${num(m.power_ps)} PS</dd><dt>${t("weight")}</dt><dd>${num(m.weight_kg)} kg</dd>
        <dt>PS/t ${info("ps_t", t)}</dt><dd>${num(m.ps_per_t, 1)}</dd><dt>${t("balance")} ${info("balance", t)}</dt><dd>${m.balance ?? "—"}</dd>
        <dt>${t("handling")}</dt><dd>${hand(c.handling.low)} / ${hand(c.handling.high)}</dd></dl></div>`;
    app.querySelectorAll("#changes [data-i]").forEach((r) => r.classList.toggle("sel", +r.dataset.i === selected));
  };
  app.querySelector("#changes").onclick = (ev) => { const r = ev.target.closest("[data-i]"); if (r) { selected = +r.dataset.i; renderCtx(); app.querySelector("#details").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } };
  app.querySelector("#metric").onclick = (ev) => {
    const k = ev.target.dataset.k; if (!k) return;
    app.querySelectorAll("#metric button").forEach((b) => { b.classList.toggle("on", b === ev.target); b.setAttribute("aria-pressed", String(b === ev.target)); });
    box.innerHTML = chart(hist, k, box.clientWidth || undefined);
  };
  const box = app.querySelector("#chart");
  box.innerHTML = chart(hist, "pp", box.clientWidth || undefined);
  renderCtx();
}

// drawn at the box's real width so axis text keeps its size (a stretched viewBox squashed it on phones)
// shortcut: not redrawn on resize/rotation (it then scales uniformly), add a ResizeObserver if that matters
function chart(hist, key, W = 1000) {
  const H = 260, P = { l: 56, r: 12, t: 12, b: 28 };
  const vals = hist.flatMap((e) => ["h", "m", "l"].map((s) => e.sets[s][key])).filter((v) => typeof v === "number");
  if (!vals.length) return html`<p class="muted">—</p>`;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const x = (i) => P.l + (i / Math.max(1, hist.length - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const lines = ["l", "m", "h"].map((s) => {
    let d = "";
    hist.forEach((e, i) => { const v = e.sets[s][key]; if (typeof v !== "number") return; d += d ? ` H${x(i)} V${y(v)}` : `M${x(i)} ${y(v)}`; });
    return html`<path d="${d}" fill="none" stroke="var(--${s})" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  });
  const ticks = [0, 0.5, 1].map((f) => { const v = lo + f * (hi - lo); return html`<text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(key === "pp" ? 1 : 0)}</text><line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>`; });
  const step = Math.ceil(hist.length / Math.max(2, Math.min(8, Math.floor((W - P.l) / 64)))); // ≥64 px per version label
  const last = hist.length - 1; // last label ends at the edge so it isn't clipped; skip a step label that would collide with it
  const xl = hist.map((e, i) => (i === last || (i % step === 0 && last - i >= step / 2) ? html`<text x="${x(i)}" y="${H - 8}" text-anchor="${i === last && i ? "end" : "middle"}">${e.v}</text>` : ""));
  return html`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${key}">${ticks}${lines}${xl}</svg>`;
}
