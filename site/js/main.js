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
    app.innerHTML = `<div class="panel">${t("load_error")} (${esc(e.message)}).</div>`;
  }
  const h1 = app.querySelector("h1");
  if (focusOnRoute && h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
  focusOnRoute = true;
}

window.addEventListener("hashchange", route);
route();
