import { t } from "../i18n.js";
import { esc, info } from "../format.js";
import { load, store } from "../data.js";
import { app, tierBadge, fmtDate } from "../ui.js";
import { rulesText, whyText, summaryText, carLink, isStale } from "../week.js";

let shown = "this";
const pageUrl = () => location.origin + location.pathname + "#/week";
const classLabel = (r) => (r.group ? "Gr." + r.group.slice(2) : r.kind === "one-make" ? t("one_make_label") : r.category);
const isMult = (x) => (parseFloat(String(x ?? "").replace(/[^\d.]/g, "")) || 1) !== 1;

function body(r) {
  if (r.kind === "bop") {
    if (!r.cars.length) return `<p class="muted">${t("no_track_data")}</p>`;
    return `<h3>${t("top5")}</h3><ol class="race-cars">${r.cars.map((c) => `
      <li>${tierBadge(c.tier)} <span class="rc-name">${carLink(store.index, c)}</span>
        ${whyText(c.why, t) ? `<span class="why">${esc(whyText(c.why, t))}</span>` : ""}
        <span class="badge ${c.source === "real" ? "lb" : "est"}">${c.source === "real" ? esc(t("src_real", c.laps)) : t("src_est")}</span></li>`).join("")}</ol>`;
  }
  if (r.kind === "one-make") return `<p>${t("one_make", carLink(store.index, r.car ?? ""))}</p>`;
  if (r.kind === "tbd") return `<p class="muted">${esc(t("tbd_race", r.start ? fmtDate(r.start) : ""))}</p>`;
  return `<p class="muted">${t("other_race")}</p>`;
}

function card(r, i) {
  const meta = [t("race_letter", esc(r.race)), esc(classLabel(r) || ""), r.start ? esc(fmtDate(r.start)) : ""].filter(Boolean).join(" · ");
  return `<article class="panel race">
    <div class="race-head"><span class="letter" aria-hidden="true">${esc(r.race)}</span>
      <div><h2>${esc(r.track)}</h2><p class="muted">${meta}</p></div></div>
    <p class="rules">${esc(rulesText(r, t))} ${isMult(r.fuel) ? info("fuel_x", t) : ""} ${isMult(r.tyre_wear) ? info("wear_x", t) : ""}</p>
    ${body(r)}
    <div class="copy-wrap"><button type="button" class="btn ghost copy" data-i="${i}">${t("copy")}</button></div>
  </article>`;
}

export async function weekPage() {
  const data = await load("week.json");
  const render = () => {
    const races = data.weeks.find((w) => w.label === shown)?.races ?? [];
    app.innerHTML = `
      <h1>${t("week_title")}</h1>
      ${isStale(data.generated) ? `<p class="panel stale" role="note">${esc(t("stale_note", fmtDate(data.generated)))}</p>` : ""}
      <div class="seg" id="wk" role="group" aria-label="${t("week_title")}">${["this", "next"].map((w) => `<button type="button" class="${w === shown ? "on" : ""}" aria-pressed="${w === shown}" data-w="${w}">${t(w + "_week")}</button>`).join("")}</div>
      <div class="races">${races.length ? races.map(card).join("") : `<p class="panel">${t("next_empty")}</p>`}</div>
      <p class="note">${t("generated")}: ${esc(fmtDate(data.generated))}</p>`;
    app.querySelector("#wk").onclick = (e) => { const b = e.target.closest("[data-w]"); if (b && b.dataset.w !== shown) { shown = b.dataset.w; render(); app.querySelector(`#wk [data-w="${shown}"]`).focus(); } };
    app.querySelector(".races").onclick = (e) => {
      const b = e.target.closest(".copy");
      if (!b) return;
      const text = summaryText(races[+b.dataset.i], pageUrl(), t);
      const wrap = b.parentElement;
      const manual = () => { // clipboard blocked: show the text ready to copy by hand
        wrap.innerHTML = `<label class="small">${t("copy_manual")}<textarea readonly rows="3">${esc(text)}</textarea></label>`;
        const ta = wrap.querySelector("textarea"); ta.focus(); ta.select();
      };
      if (!navigator.clipboard) return manual();
      navigator.clipboard.writeText(text).then(() => { b.textContent = t("copied"); }, manual);
    };
  };
  render();
}

// compact strip for the home page; renders nothing when week.json is missing
export async function weekStrip() {
  let data;
  try { data = await load("week.json"); } catch { return ""; }
  const races = data.weeks?.find((w) => w.label === "this")?.races ?? [];
  if (!races.length || isStale(data.generated)) return ""; // never present old races as "this week"
  return `<section class="panel strip" aria-labelledby="strip-h"><h2 id="strip-h">${t("week_strip")}</h2>
    <div class="strip-grid">${races.map((r) => `<div class="card"><span class="letter sm" aria-hidden="true">${esc(r.race)}</span>
      <b>${esc(r.track)}</b><span class="muted small">${t("race_letter", esc(r.race))} · ${esc(classLabel(r) || "")}</span>
      ${r.kind === "bop" && r.cars[0] ? `<span class="small">${t("best_bet")}: ${carLink(store.index, r.cars[0])}</span>` : ""}</div>`).join("")}</div>
    <a class="link-more" href="#/week">${t("see_guide")} →</a></section>`;
}
