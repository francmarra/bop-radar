import { t } from "../i18n.js";
import { esc } from "../format.js";
import { store } from "../data.js";
import { app } from "../ui.js";

export function helpPage() {
  app.innerHTML = `<section class="panel prose">${t("about")}<p class="muted">${esc(store.index.generated)} · <a href="https://gt-engine.com/gt7/">GT ENG!NE</a> · <a href="https://gtsh-rank.com/daily/">gtsh-rank</a> · <a href="https://github.com/ddm999/gt7info">gt7info</a></p></section>`;
}
