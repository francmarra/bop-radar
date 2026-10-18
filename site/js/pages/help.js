import { t } from "../i18n.js";
import { esc } from "../format.js";
import { store } from "../data.js";
import { app } from "../ui.js";

const GLOSSARY = ["bop", "pp", "ps_t", "balance", "track_types", "level", "estimates"];

export function helpPage() {
  app.innerHTML = `
    <section class="panel prose">
      <h1>${t("help_title")}</h1>
      <h2>${t("how_title")}</h2>
      <ol class="steps">${["step1", "step2", "step3"].map((k) => `<li>${t(k)}</li>`).join("")}</ol>
    </section>
    <section class="panel prose">
      <h2>${t("glossary_title")}</h2>
      <dl class="glossary">${GLOSSARY.map((k) => `<dt>${esc(t("term_" + k))}</dt><dd>${esc(t("help_" + k))}</dd>`).join("")}</dl>
    </section>
    <section class="panel prose">
      <h2>${t("data_title")}</h2>
      <p>${t("data_text")}</p>
      <p>${esc(t("help_estimates"))}</p>
      <p>${esc(t("privacy_text"))}</p>
      <p class="muted">${t("generated")}: ${esc(store.index.generated)} · ${t("not_official")}</p>
    </section>`;
}
