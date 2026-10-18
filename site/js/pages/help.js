import { t } from "../i18n.js";
import { html, raw } from "../format.js";
import { store } from "../data.js";
import { app } from "../ui.js";

const GLOSSARY = ["bop", "pp", "ps_t", "balance", "balance_idx", "track_types", "level", "estimates"];

export function helpPage() {
  app.innerHTML = html`
    <section class="panel prose">
      <h1>${t("help_title")}</h1>
      <h2>${t("how_title")}</h2>
      <ol class="steps">${["step1", "step2", "step3"].map((k) => html`<li>${t(k)}</li>`)}</ol>
    </section>
    <section class="panel prose">
      <h2>${t("glossary_title")}</h2>
      <dl class="glossary">${GLOSSARY.map((k) => html`<dt>${t("term_" + k)}</dt><dd>${t("help_" + k)}</dd>`)}</dl>
    </section>
    <section class="panel prose">
      <h2>${t("data_title")}</h2>
      <p>${raw(t("data_text"))}</p>
      <p>${t("help_estimates")}</p>
      <p>${t("privacy_text")}</p>
      <p>${t("img_credit")}</p>
      <p class="muted">${t("generated")}: ${store.index.generated} · ${t("not_official")}</p>
    </section>`;
}
