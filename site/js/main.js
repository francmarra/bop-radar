/* GT7 BoP Radar — static SPA (hash routes): #/ · #/tracks · #/track/<id>/<group> · #/car/<id> · #/updates · #/update/<v> · #/about */
import { t, lang, setLang } from "./i18n.js";
import { esc } from "./format.js";
import { getIndex, store } from "./data.js";
import { app } from "./ui.js";
import { homePage } from "./pages/home.js";
import { tracksPage, trackPage } from "./pages/tracks.js";
import { updatesPage, updatePage } from "./pages/updates.js";
import { carPage } from "./pages/car.js";

function chrome() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  document.querySelectorAll(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
}
document.querySelector(".lang").onclick = (e) => {
  const l = e.target.dataset.lang;
  if (!l || l === lang) return;
  setLang(l);
  route();
};

async function route() {
  const [page, a, b] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  chrome();
  document.querySelectorAll("nav a").forEach((x) => x.classList.toggle("on", x.dataset.page === (page || "rankings") || (page === "track" && x.dataset.page === "tracks") || (page === "update" && x.dataset.page === "updates")));
  window.scrollTo(0, 0);
  try {
    await getIndex();
    if (page === "car") await carPage(a);
    else if (page === "tracks") await tracksPage();
    else if (page === "track") await trackPage(a, b);
    else if (page === "update") await updatePage(a);
    else if (page === "updates") updatesPage();
    else if (page === "about") app.innerHTML = `<section class="panel prose">${t("about")}<p class="muted">${esc(store.index.generated)} · <a href="https://gt-engine.com/gt7/">GT ENG!NE</a> · <a href="https://gtsh-rank.com/daily/">gtsh-rank</a> · <a href="https://github.com/ddm999/gt7info">gt7info</a></p></section>`;
    else await homePage();
  } catch (e) {
    app.innerHTML = `<div class="panel">${t("load_error")} (${esc(e.message)}).</div>`;
  }
}

window.addEventListener("hashchange", route);
route();
