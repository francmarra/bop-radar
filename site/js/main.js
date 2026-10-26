/* GT7 BoP Radar — static SPA with real paths: / · week/ · updates/ · update/<v>/ · car/<id>/ · help/ (tracks/, track/<id>/<g>/ unlinked) */
import { t, lang, setLang } from "./i18n.js";
import { html } from "./format.js";
import { getIndex, getImages, store } from "./data.js";
import { app } from "./ui.js";
import { initTheme, toggleTheme } from "./theme.js";
import { BASE, pathOf, hashToPath, link, rootPath, shouldIntercept } from "./router.js";
import { mountSearch } from "./search.js";
import { homePage } from "./pages/home.js";
import { rankingPage } from "./pages/ranking.js";
import { tracksPage, trackPage } from "./pages/tracks.js";
import { updatesPage, updatePage } from "./pages/updates.js";
import { carPage } from "./pages/car.js";
import { helpPage } from "./pages/help.js";
import { weekPage } from "./pages/week.js";

function chrome() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  document.querySelectorAll(".lang button").forEach((b) => { b.classList.toggle("on", b.dataset.lang === lang); b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
  document.getElementById("theme").setAttribute("aria-label", t("theme_toggle"));
  document.getElementById("settings-btn").setAttribute("aria-label", t("settings"));
  q.placeholder = t("find_ph"); qEmpty.dataset.msg = t("find_empty");
}
const dlg = document.getElementById("search-dlg"), q = document.getElementById("q"), qList = document.getElementById("q-list"), qEmpty = document.getElementById("q-empty");
let searchMounted = false;
initTheme();
document.getElementById("search-open").onclick = async () => {
  dlg.showModal(); // native: Escape, focus trap and focus return to this button
  q.value = ""; q.focus();
  try { const ix = await getIndex(); if (!searchMounted) { searchMounted = true; mountSearch(q, ix, { listbox: qList, empty: qEmpty }); } } catch { /* route() shows the load error */ }
};
document.getElementById("search-close").onclick = () => dlg.close();
document.getElementById("theme").onclick = () => toggleTheme();
document.querySelector(".skip").onclick = (e) => { e.preventDefault(); app.focus(); };
document.querySelector(".lang").onclick = (e) => {
  const l = e.target.dataset.lang;
  if (!l || l === lang) return;
  setLang(l);
  route();
};

let focusOnRoute = false; // not on first load, so the page starts at the top for everyone
async function route() {
  const [page, a, b] = pathOf(location.pathname);
  chrome();
  dlg.close(); // choosing a car navigates; browser back also lands here
  const current = { ranking: "ranking", car: "ranking", week: "week", update: "updates", updates: "updates" }[page ?? ""];
  document.querySelectorAll("nav.tabs a").forEach((x) => {
    const on = x.dataset.page === current;
    x.classList.toggle("on", on);
    if (on) x.setAttribute("aria-current", "page"); else x.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  try {
    await Promise.all([getIndex(), getImages()]);
    if (page === "car") await carPage(a);
    else if (page === "tracks") await tracksPage();
    else if (page === "track") await trackPage(a, b);
    else if (page === "update") await updatePage(a);
    else if (page === "updates") updatesPage();
    else if (page === "ranking") rankingPage();
    else if (page === "week") await weekPage();
    else if (page === "help" || page === "about") helpPage();
    else await homePage();
  } catch (e) {
    app.innerHTML = html`<div class="panel" role="alert"><h1>${t("load_error")}</h1><p class="muted small">${e.message}</p><button type="button" class="btn" id="retry">${t("retry")}</button></div>`;
    app.querySelector("#retry").onclick = () => route();
  }
  const h1 = app.querySelector("h1");
  // first load keeps the pre-rendered, search-friendly <title>; in-app navigation updates it
  if (focusOnRoute) document.title = page && h1 ? `${h1.textContent.trim()} — GT7 BoP Radar` : "GT7 BoP Radar";
  if (focusOnRoute && h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
  // GoatCounter (production builds only) counts the first load itself; in-app navigation is counted here
  if (focusOnRoute) window.goatcounter?.count?.({ path: location.pathname, title: document.title });
  focusOnRoute = true;
}

// links shared before the switch to paths (#/car/x) land on the real page
const legacy = hashToPath(location.hash);
if (legacy !== null) history.replaceState(null, "", link(legacy));
// header links are relative in the HTML (for crawlers); make them absolute for in-app navigation
document.querySelectorAll("header a[href], footer a[data-t=\"nav_help\"]").forEach((a) => { a.href = link(rootPath(a.getAttribute("href"))); });
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || !shouldIntercept(e, a, location.origin, BASE, location.pathname)) return;
  e.preventDefault();
  if (a.href !== location.href) history.pushState(null, "", a.href);
  route();
});
window.addEventListener("popstate", route);
route();

/* ⓘ popovers: one open at a time; click/tap or Enter toggles, Esc or a click elsewhere closes */
const closeTips = (except) => document.querySelectorAll('.info[aria-expanded="true"]').forEach((b) => {
  if (b === except) return;
  b.setAttribute("aria-expanded", "false");
  document.getElementById(b.getAttribute("aria-controls")).hidden = true;
});
document.addEventListener("click", (e) => {
  const b = e.target.closest(".info");
  closeTips(b);
  if (!b) return;
  e.preventDefault(); e.stopPropagation(); // the button may sit inside a link row
  const open = b.getAttribute("aria-expanded") !== "true";
  b.setAttribute("aria-expanded", String(open));
  document.getElementById(b.getAttribute("aria-controls")).hidden = !open;
}, true);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const open = document.querySelector('.info[aria-expanded="true"]');
  if (open) { closeTips(); open.focus(); }
});
