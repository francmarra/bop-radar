/* GT7 BoP Radar — static SPA (hash routes): #/ · #/tracks · #/track/<id>/<group> · #/car/<id> · #/updates · #/update/<v> · #/about */
import { t, lang, setLang } from "./i18n.js";
import { esc } from "./format.js";
import { getIndex, store } from "./data.js";
import { app } from "./ui.js";
import { initTheme, toggleTheme } from "./theme.js";
import { homePage } from "./pages/home.js";
import { tracksPage, trackPage } from "./pages/tracks.js";
import { updatesPage, updatePage } from "./pages/updates.js";
import { carPage } from "./pages/car.js";
import { helpPage } from "./pages/help.js";

function chrome() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  document.querySelectorAll(".lang button").forEach((b) => { b.classList.toggle("on", b.dataset.lang === lang); b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
  document.getElementById("theme").setAttribute("aria-label", t("theme_toggle"));
}
initTheme();
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
  const [page, a, b] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  chrome();
  const current = { "": "home", car: "home", update: "updates", updates: "updates", help: "help", about: "help" }[page ?? ""];
  document.querySelectorAll("nav a").forEach((x) => {
    const on = x.dataset.page === current;
    x.classList.toggle("on", on);
    if (on) x.setAttribute("aria-current", "page"); else x.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  try {
    await getIndex();
    if (page === "car") await carPage(a);
    else if (page === "tracks") await tracksPage();
    else if (page === "track") await trackPage(a, b);
    else if (page === "update") await updatePage(a);
    else if (page === "updates") updatesPage();
    else if (page === "help" || page === "about") helpPage();
    else await homePage();
  } catch (e) {
    app.innerHTML = `<div class="panel" role="alert"><h1>${t("load_error")}</h1><p class="muted small">${esc(e.message)}</p><button type="button" class="btn" id="retry">${t("retry")}</button></div>`;
    app.querySelector("#retry").onclick = () => route();
  }
  const h1 = app.querySelector("h1");
  if (focusOnRoute && h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
  focusOnRoute = true;
}

window.addEventListener("hashchange", route);
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
