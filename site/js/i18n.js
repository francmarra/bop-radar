/* Strings EN/PT and t(). DOM-free. */
export const I18N = {
  en: {
    nav_rankings: "Rankings", nav_tracks: "Tracks", nav_updates: "Updates", nav_about: "About", theme_toggle: "Switch light/dark theme",
    loading: "Loading…", load_error: "Could not load data", latest: "Latest BoP update", version: "Version",
    see_changes: "See all changes", no_change: "no change", search_car: "Search car or maker…", search_track: "Search track…",
    track_type: "Track type", set_h: "Fast", set_m: "Medium", set_l: "Twisty",
    set_h_long: "High-speed tracks", set_m_long: "Mid-speed tracks", set_l_long: "Low-speed tracks",
    col_car: "Car", col_pp: "PP", col_best: "Best on", col_last: "Last change", col_traits: "Traits", col_tier: "Tier",
    rank_note: "Rank = PP under the selected track type's BoP. Tiers: S top 10 %, A ≤35 %, B ≤70 %, C rest.",
    no_match: "No cars match.", find_car: "Which car for which track?", find_car_sub: "Pick a track and a class to see the best cars, from real leaderboard times.",
    pick_track: "Choose a track", go: "Show cars", tyres: "Tyres", fuel: "Fuel", tyre_wear: "Tyre wear", fuel_use: "Fuel use",
    buff: "buff", nerf: "nerf", mixed: "mixed", unchanged: "unchanged", first_seen: "first seen",
    pp_only: "PP only", bop_of: (s) => `${s} BoP`,
    updates_title: "BoP updates", updates_sub: "Every game version that changed power or weight of a Gr.1–4 car.",
    cars_changed: (n) => `${n} cars changed`, update_note: "Verdict = average power-to-weight change over the BoP sets that changed: buff > +0.25 %, nerf < −0.25 %, otherwise mixed.",
    col_verdict: "Verdict", col_pw: "Power / weight", col_dpp: "ΔPP", col_rank: "Rank", col_context: "Context after update",
    back_rank: (g) => `← ${g} rankings`, ctx_title: (v, d) => `Performance at ${v} (${d})`, ctx_hint: "Pick a row in “BoP changes” to see an older update",
    track_fit: "Track fit", strengths: "Strengths", weaknesses: "Weaknesses", none: "nothing stands out", estimates: "Estimates relative to the class (weight, torque, drivetrain, power).",
    specs: "Specs (medium-track BoP)", power: "Power", weight: "Weight", balance: "Balance F:R", handling: "Handling", notes: "Notes",
    history: "History", bop_changes: "BoP changes", col_version: "Version", col_date: "Date",
    track_record: "Leaderboard record", track_record_sub: "Daily Race results with this car (top 1000 laps per event).", gap: "Gap", events: "Events",
    tracks_title: "Tracks", tracks_sub: "Choose a layout to see which cars are fastest there.", with_data: (n) => `${n} leaderboard events`, no_data: "model estimate only",
    track_cars: "Best cars", score: "Score", evidence: "Evidence", ev_lb: "Leaderboard", ev_model: "Estimate",
    gap_note: "Gap = median of the car's best 20 laps vs. the 20 fastest laps of the event (top 1000 laps). Older events and events before the car's last BoP change count less.",
    top100: "in top 100", race_events: "Daily Race events", no_events: "No Daily Race with this class here yet — ranking is the model's estimate for this track type.",
    low: "low", medium: "medium", high: "high", neutral: "neutral", understeer: "understeer", oversteer: "oversteer",
    footer_est: "tyre wear & fuel are estimates", unofficial: "not affiliated with Polyphony Digital",
    tr: { "straight-line speed": "straight-line speed", acceleration: "acceleration", "low-speed cornering": "low-speed cornering", "high-speed cornering": "high-speed cornering" },
    summary(b) {
      const p = [];
      const d = b.delta || {};
      if (b.changed && (d.power_ps || d.weight_kg)) {
        const bits = [d.power_ps && `${d.power_ps > 0 ? "+" : ""}${d.power_ps} PS`, d.weight_kg && `${d.weight_kg > 0 ? "+" : ""}${d.weight_kg} kg`].filter(Boolean);
        p.push(`${cap(this[b.verdict] || b.verdict)} (${bits.join(", ")}).`);
      }
      const set = this["set_" + b.best_set + "_long"].toLowerCase();
      p.push(`Ranked ${b.rank}/${b.of} (${b.tier} tier), ${b.all_rounder ? `an all-rounder with a slight edge on ${set}` : `best on ${set}`}.`);
      if (b.strengths.length) p.push(`Good at ${b.strengths.map((s) => this.tr[s]).join(", ")}.`);
      p.push(`Estimated tyre wear ${this[b.tyre_wear]}, fuel use ${this[b.fuel_use]}.`);
      return p.join(" ");
    },
    about: `<h1>About</h1>
      <p>Tracks Gran Turismo 7 <b>Balance of Performance</b> for Gr.1–Gr.4. Since 1.19 the game uses three BoP sets — high-, mid- and low-speed — picked by track.</p>
      <h2>How cars are rated</h2><ul>
      <li><b>Rank / tier</b>: PP within the class under each BoP set.</li>
      <li><b>Verdict</b>: change in power-to-weight vs. the previous version.</li>
      <li><b>Track fit</b>: half PP rank, half the traits each track type rewards (straight-line speed, cornering at 60/120/240 km/h, acceleration).</li>
      <li><b>Per-track rating</b>: 70 % real pace from Daily Race leaderboards on that exact layout (top 1000 laps per event, newer events and events after the car's last BoP change weigh more) + 30 % model fit. Without leaderboard data the rating is the model's estimate.</li>
      <li><b>Tyre wear &amp; fuel</b>: heuristic estimates — not measured yet. Real values will come from <a href="https://github.com/francmarra">gt7-telemetry</a>.</li></ul>`,
  },
  pt: {
    nav_rankings: "Rankings", nav_tracks: "Pistas", nav_updates: "Atualizações", nav_about: "Sobre", theme_toggle: "Mudar tema claro/escuro",
    loading: "A carregar…", load_error: "Não foi possível carregar os dados", latest: "Última atualização de BoP", version: "Versão",
    see_changes: "Ver todas as alterações", no_change: "sem alterações", search_car: "Procurar carro ou marca…", search_track: "Procurar pista…",
    track_type: "Tipo de pista", set_h: "Rápida", set_m: "Média", set_l: "Lenta",
    set_h_long: "Pistas rápidas", set_m_long: "Pistas médias", set_l_long: "Pistas lentas",
    col_car: "Carro", col_pp: "PP", col_best: "Melhor em", col_last: "Última alteração", col_traits: "Características", col_tier: "Tier",
    rank_note: "Posição = PP com o BoP do tipo de pista escolhido. Tiers: S top 10 %, A ≤35 %, B ≤70 %, C resto.",
    no_match: "Nenhum carro encontrado.", find_car: "Que carro para que pista?", find_car_sub: "Escolhe a pista e a classe para ver os melhores carros, com base em tempos reais das leaderboards.",
    pick_track: "Escolhe uma pista", go: "Ver carros", tyres: "Pneus", fuel: "Combustível", tyre_wear: "Desgaste de pneus", fuel_use: "Consumo",
    buff: "melhorado", nerf: "penalizado", mixed: "misto", unchanged: "sem alteração", first_seen: "estreia",
    pp_only: "só PP", bop_of: (s) => `BoP ${s.toLowerCase()}`,
    updates_title: "Atualizações de BoP", updates_sub: "Todas as versões do jogo que mudaram potência ou peso de um carro Gr.1–4.",
    cars_changed: (n) => `${n} carros alterados`, update_note: "Veredito = variação média da relação potência/peso nos conjuntos de BoP alterados: melhorado > +0,25 %, penalizado < −0,25 %, senão misto.",
    col_verdict: "Veredito", col_pw: "Potência / peso", col_dpp: "ΔPP", col_rank: "Posição", col_context: "Contexto após a atualização",
    back_rank: (g) => `← Rankings ${g}`, ctx_title: (v, d) => `Performance na ${v} (${d})`, ctx_hint: "Escolhe uma linha em “Alterações de BoP” para ver uma versão anterior",
    track_fit: "Adequação à pista", strengths: "Pontos fortes", weaknesses: "Pontos fracos", none: "nada se destaca", estimates: "Estimativas relativas à classe (peso, binário, tração, potência).",
    specs: "Especificações (BoP de pista média)", power: "Potência", weight: "Peso", balance: "Distribuição F:T", handling: "Comportamento", notes: "Notas",
    history: "Histórico", bop_changes: "Alterações de BoP", col_version: "Versão", col_date: "Data",
    track_record: "Registo nas leaderboards", track_record_sub: "Resultados das Daily Races com este carro (top 1000 voltas por evento).", gap: "Diferença", events: "Eventos",
    tracks_title: "Pistas", tracks_sub: "Escolhe um traçado para ver que carros são mais rápidos lá.", with_data: (n) => `${n} eventos com leaderboard`, no_data: "só estimativa do modelo",
    track_cars: "Melhores carros", score: "Pontuação", evidence: "Base", ev_lb: "Leaderboard", ev_model: "Estimativa",
    gap_note: "Diferença = mediana das 20 melhores voltas do carro vs. as 20 voltas mais rápidas do evento (top 1000). Eventos antigos ou anteriores à última alteração de BoP do carro contam menos.",
    top100: "no top 100", race_events: "Eventos Daily Race", no_events: "Ainda não houve Daily Race desta classe aqui — o ranking é a estimativa do modelo para este tipo de pista.",
    low: "baixo", medium: "médio", high: "alto", neutral: "neutro", understeer: "subviragem", oversteer: "sobreviragem",
    footer_est: "desgaste de pneus e consumo são estimativas", unofficial: "sem ligação à Polyphony Digital",
    tr: { "straight-line speed": "velocidade em reta", acceleration: "aceleração", "low-speed cornering": "curvas lentas", "high-speed cornering": "curvas rápidas" },
    summary(b) {
      const p = [];
      const d = b.delta || {};
      if (b.changed && (d.power_ps || d.weight_kg)) {
        const bits = [d.power_ps && `${d.power_ps > 0 ? "+" : ""}${d.power_ps} PS`, d.weight_kg && `${d.weight_kg > 0 ? "+" : ""}${d.weight_kg} kg`].filter(Boolean);
        p.push(`${cap(this[b.verdict] || b.verdict)} (${bits.join(", ")}).`);
      }
      const set = this["set_" + b.best_set + "_long"].toLowerCase();
      p.push(`${b.rank}.º de ${b.of} (tier ${b.tier}), ${b.all_rounder ? `polivalente, com ligeira vantagem em ${set}` : `mais forte em ${set}`}.`);
      if (b.strengths.length) p.push(`Bom em ${b.strengths.map((s) => this.tr[s]).join(", ")}.`);
      p.push(`Desgaste de pneus estimado ${this[b.tyre_wear]}, consumo ${this[b.fuel_use]}.`);
      return p.join(" ");
    },
    about: `<h1>Sobre</h1>
      <p>Acompanha o <b>Balance of Performance</b> do Gran Turismo 7 para Gr.1–Gr.4. Desde a 1.19 o jogo usa três conjuntos de BoP — pistas rápidas, médias e lentas — escolhidos pela pista.</p>
      <h2>Como os carros são avaliados</h2><ul>
      <li><b>Posição / tier</b>: PP dentro da classe em cada conjunto de BoP.</li>
      <li><b>Veredito</b>: variação da relação potência/peso face à versão anterior.</li>
      <li><b>Adequação à pista</b>: metade posição em PP, metade as características que cada tipo de pista premeia (reta, curvas a 60/120/240 km/h, aceleração).</li>
      <li><b>Avaliação por pista</b>: 70 % ritmo real nas leaderboards das Daily Races nesse traçado (top 1000 voltas por evento; eventos recentes e posteriores à última alteração de BoP do carro pesam mais) + 30 % modelo. Sem dados de leaderboard, é a estimativa do modelo.</li>
      <li><b>Pneus e combustível</b>: estimativas heurísticas — ainda não medidas. Os valores reais virão do <a href="https://github.com/francmarra">gt7-telemetry</a>.</li></ul>`,
  },
};
export let lang = "en";
try { lang = localStorage.getItem("lang") || (navigator.language.startsWith("pt") ? "pt" : "en"); } catch { /* storage blocked */ }
export function setLang(l) {
  lang = l;
  try { localStorage.setItem("lang", l); } catch { /* ignore */ }
}
export const t = (k, ...a) => { const v = I18N[lang][k] ?? I18N.en[k] ?? k; return typeof v === "function" ? v(...a) : v; };
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const summary = (b) => (b ? I18N[lang].summary(b) : "");
