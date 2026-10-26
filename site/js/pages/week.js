import { t } from "../i18n.js";
import { link, BASE } from "../router.js";
import { html, raw, info, num, vtext } from "../format.js";
import { load, store } from "../data.js";
import { app, fmtDate } from "../ui.js";
import { rulesText, whyText, summaryText, carLink, findCar, isStale } from "../week.js";
import { carImg } from "../carimg.js";
import { carRow } from "../row.js";

let shown = "this";
const pageUrl = () => location.origin + link("week/");
const classLabel = (r) => (r.group ? "Gr." + r.group.slice(2) : r.kind === "one-make" ? t("one_make_label") : r.category);
const carId = (c) => findCar(store.index, c)?.id ?? c?.id ?? "";
const srcText = (c) => (c.source === "live" ? t("src_live", c.share) : c.source === "real" ? t("src_real", c.laps) : t("src_est"));
const carHref = (c) => (carId(c) ? `${BASE}car/${encodeURIComponent(carId(c))}/` : "");
const isMult = (x) => (parseFloat(String(x ?? "").replace(/[^\d.]/g, "")) || 1) !== 1;

function body(r) {
  if (r.kind === "bop") {
    if (!r.cars.length) return html`<p class="muted">${t("no_track_data")}</p>`;
    const why = r.cars.filter((c) => whyText(c.why, t));
    return html`<h3>${t("top5")}</h3><div class="rows">${r.cars.map((c, i) => carRow({ href: carHref(c), id: carId(c), name: c.name, sub: srcText(c), pos: i + 1, tier: c.tier, estimate: c.source === "estimate" }))}</div>
      ${why.length ? html`<details class="why-rules"><summary>${t("why_rules")}</summary><ul>${why.map((c) => html`<li><b>${c.name}</b>: ${whyText(c.why, t)}</li>`)}</ul></details>` : ""}`;
  }
  if (r.kind === "one-make") return html`<p>${raw(t("one_make", carLink(store.index, r.car ?? "")))}</p>`; // carLink escapes the name
  if (r.kind === "tbd") return html`<p class="muted">${t("tbd_race", r.start ? fmtDate(r.start) : "")}</p>`;
  return html`<p class="muted">${t("other_race")}</p>`;
}

function card(r, i) {
  const meta = [t("race_letter", r.race), classLabel(r) || "", r.start ? fmtDate(r.start) : ""].filter(Boolean).join(" · ");
  return html`<article class="panel race">
    <div class="race-head"><span class="letter" aria-hidden="true">${r.race}</span>
      <div><h2>${r.track}</h2><p class="muted">${meta}</p></div>
      ${r.kind === "bop" && r.cars[0] ? html`<div class="race-feat" aria-hidden="true">${carImg(carId(r.cars[0]), "l")}<span class="feat-tag">P1</span></div>` : ""}</div>
    <p class="rules">${rulesText(r, t)} ${isMult(r.fuel) ? info("fuel_x", t) : ""} ${isMult(r.tyre_wear) ? info("wear_x", t) : ""}</p>
    ${r.balance ? html`<p class="muted small">${t("bal_race", num(r.balance, 1))} ${info("balance_idx", t)}</p>` : ""}
    ${body(r)}
    <div class="copy-wrap"><button type="button" class="btn ghost copy" data-i="${i}">${t("copy")}</button></div>
  </article>`;
}

export async function weekPage() {
  const data = await load("week.json");
  const render = () => {
    const races = data.weeks.find((w) => w.label === shown)?.races ?? [];
    app.innerHTML = html`
      <div class="page-head"><div><h1>${t("week_title")}</h1>
      ${isStale(data.generated) ? html`<p class="panel stale" role="note">${t("stale_note", fmtDate(data.generated))}</p>` : ""}
      <div class="seg" id="wk" role="group" aria-label="${t("week_title")}">${["this", "next"].map((w) => html`<button type="button" class="${w === shown ? "on" : ""}" aria-pressed="${w === shown}" data-w="${w}">${t(w + "_week")}</button>`)}</div></div>
      ${vtext("デイリーレース")}</div>
      <div class="races">${races.length ? races.map(card) : html`<p class="panel">${t("next_empty")}</p>`}</div>
      <p class="note">${t("generated")}: ${fmtDate(data.generated)}</p>`;
    app.querySelector("#wk").onclick = (e) => { const b = e.target.closest("[data-w]"); if (b && b.dataset.w !== shown) { shown = b.dataset.w; render(); app.querySelector(`#wk [data-w="${shown}"]`).focus(); } };
    app.querySelector(".races").onclick = (e) => {
      const b = e.target.closest(".copy");
      if (!b) return;
      const text = summaryText(races[+b.dataset.i], pageUrl(), t);
      const wrap = b.parentElement;
      const manual = () => { // clipboard blocked: show the text ready to copy by hand
        wrap.innerHTML = html`<label class="small">${t("copy_manual")}<textarea readonly rows="3">${text}</textarea></label>`;
        const ta = wrap.querySelector("textarea"); ta.focus(); ta.select();
      };
      if (!navigator.clipboard) return manual();
      navigator.clipboard.writeText(text).then(() => { b.textContent = t("copied"); }, manual);
    };
  };
  render();
}

// this week's races for the landing card; empty when week.json is missing or stale (never present old races as "this week")
export async function weekRaces() {
  let data;
  try { data = await load("week.json"); } catch { return []; }
  return isStale(data.generated) ? [] : data.weeks?.find((w) => w.label === "this")?.races ?? [];
}
