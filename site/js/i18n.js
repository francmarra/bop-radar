/* Strings EN/PT and t(). DOM-free. */
export const I18N = {
  en: {
    nav_rankings: "Rankings", nav_tracks: "Tracks", nav_updates: "BoP updates", nav_about: "About", nav_home: "Home", nav_help: "Help", skip: "Skip to content", theme_toggle: "Switch light/dark theme",
    loading: "Loading…", load_error: "Could not load data", latest: "Latest BoP update", bop_explain: "BoP (Balance of Performance) is the power and weight adjustment Polyphony makes to keep race cars even.", version: "Version",
    see_changes: "See all changes", no_change: "no change", search_car: "Search car or maker…", search_track: "Search track…",
    track_type: "Track type", set_h: "Fast tracks", set_m: "Medium tracks", set_l: "Slow tracks",
    set_h_long: "High-speed tracks", set_m_long: "Mid-speed tracks", set_l_long: "Low-speed tracks",
    col_car: "Car", col_pp: "Performance level (PP)", col_best: "Best track type", col_last: "Last change", col_traits: "Strengths", col_tier: "Level",
    level_S: "S: among the best", level_A: "A: strong", level_B: "B: average", level_C: "C: weaker",
    rank_note: "Position = performance level (PP) with the BoP for the chosen track type. Levels: S = top 10 %, A = top 35 %, B = top 70 %, C = the rest.",
    no_match: "No cars match.", find_car: "Which car for which track?", find_car_sub: "Pick a track and a class to see the best cars, from real leaderboard times.",
    pick_track: "Choose a track", go: "Show cars", tyres: "Tyres", fuel: "Fuel", tyre_wear: "Tyre wear", fuel_use: "Fuel use",
    buff: "Faster", nerf: "Slower", mixed: "Mixed", unchanged: "Unchanged", first_seen: "First appearance",
    pp_only: "PP only", bop_of: (s) => `${s} BoP`,
    updates_title: "BoP updates", updates_sub: "Every game version that changed power or weight of a Gr.1–4 car.",
    cars_changed: (n) => `${n} cars changed`, update_note: "Effect = average change in power-to-weight across the BoP sets that changed: faster above +0.25 %, slower below −0.25 %, otherwise mixed.",
    col_verdict: "Effect", col_pw: "Power / weight", col_dpp: "ΔPP", col_rank: "Rank", col_context: "Context after update",
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
    more_about: (x) => `More about ${x}`,
    term_bop: "BoP", term_pp: "PP", term_ps_t: "PS/t", term_balance: "weight balance", term_track_types: "track types", term_level: "level", term_estimates: "these estimates",
    help_bop: "BoP (Balance of Performance) is the power and weight adjustment Polyphony makes to keep race cars even.",
    help_pp: "Performance Points: Gran Turismo's single number for how fast a car is. Higher means faster. Within a class, BoP tries to bring every car close.",
    help_ps_t: "Horsepower per tonne of weight. Higher means stronger acceleration.",
    help_balance: "How the car's weight is split between front and rear, for example 47:53.",
    help_track_types: "Since update 1.19 each car has three BoP settings: one for fast tracks (long straights, e.g. Monza), one for medium tracks and one for slow, twisty tracks (e.g. Tsukuba).",
    help_level: "Where the car sits in its class: S = top 10 %, A = top 35 %, B = top 70 %, C = the rest.",
    help_estimates: "Tyre wear and fuel use are estimated from weight, torque, drivetrain and power. They are not measured yet.",
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
      p.push(`Ranked ${b.rank}/${b.of} (level ${b.tier}), ${b.all_rounder ? `an all-rounder with a slight edge on ${set}` : `best on ${set}`}.`);
      if (b.strengths.length) p.push(`Good at ${b.strengths.map((s) => this.tr[s]).join(", ")}.`);
      p.push(`Estimated tyre wear ${this[b.tyre_wear]}, fuel use ${this[b.fuel_use]}.`);
      return p.join(" ");
    },
    about: `<h1>About</h1>
      <p>Tracks Gran Turismo 7 <b>Balance of Performance</b> for Gr.1–Gr.4. Since 1.19 the game uses three BoP sets — high-, mid- and low-speed — picked by track.</p>
      <h2>How cars are rated</h2><ul>
      <li><b>Position / level</b>: PP within the class under each BoP set.</li>
      <li><b>Verdict</b>: change in power-to-weight vs. the previous version.</li>
      <li><b>Track fit</b>: half PP rank, half the traits each track type rewards (straight-line speed, cornering at 60/120/240 km/h, acceleration).</li>
      <li><b>Per-track rating</b>: 70 % real pace from Daily Race leaderboards on that exact layout (top 1000 laps per event, newer events and events after the car's last BoP change weigh more) + 30 % model fit. Without leaderboard data the rating is the model's estimate.</li>
      <li><b>Tyre wear &amp; fuel</b>: heuristic estimates — not measured yet. Real values will come from <a href="https://github.com/francmarra">gt7-telemetry</a>.</li></ul>`,
  },
  pt: {
    nav_rankings: "Rankings", nav_tracks: "Pistas", nav_updates: "Atualizações de BoP", nav_about: "Sobre", nav_home: "Início", nav_help: "Ajuda", skip: "Saltar para o conteúdo", theme_toggle: "Mudar tema claro/escuro",
    loading: "A carregar…", load_error: "Não foi possível carregar os dados", latest: "Última atualização de BoP", bop_explain: "O BoP (Balance of Performance) é o ajuste de potência e peso que a Polyphony faz para equilibrar os carros de corrida.", version: "Versão",
    see_changes: "Ver todas as alterações", no_change: "sem alterações", search_car: "Procurar carro ou marca…", search_track: "Procurar pista…",
    track_type: "Tipo de pista", set_h: "Pistas rápidas", set_m: "Pistas médias", set_l: "Pistas lentas",
    set_h_long: "Pistas rápidas", set_m_long: "Pistas médias", set_l_long: "Pistas lentas",
    col_car: "Carro", col_pp: "Nível de performance (PP)", col_best: "Melhor tipo de pista", col_last: "Última alteração", col_traits: "Pontos fortes", col_tier: "Nível",
    level_S: "S: dos melhores", level_A: "A: forte", level_B: "B: médio", level_C: "C: mais fraco",
    rank_note: "Posição = nível de performance (PP) com o BoP do tipo de pista escolhido. Níveis: S = 10 % melhores, A = 35 % melhores, B = 70 % melhores, C = restantes.",
    no_match: "Nenhum carro encontrado.", find_car: "Que carro para que pista?", find_car_sub: "Escolhe a pista e a classe para ver os melhores carros, com base em tempos reais das leaderboards.",
    pick_track: "Escolhe uma pista", go: "Ver carros", tyres: "Pneus", fuel: "Combustível", tyre_wear: "Desgaste de pneus", fuel_use: "Consumo",
    buff: "Mais rápido", nerf: "Mais lento", mixed: "Misto", unchanged: "Sem alteração", first_seen: "Primeira aparição",
    pp_only: "só PP", bop_of: (s) => `BoP ${s.toLowerCase()}`,
    updates_title: "Atualizações de BoP", updates_sub: "Todas as versões do jogo que mudaram potência ou peso de um carro Gr.1–4.",
    cars_changed: (n) => `${n} carros alterados`, update_note: "Efeito = variação média da relação potência/peso nos conjuntos de BoP alterados: mais rápido acima de +0,25 %, mais lento abaixo de −0,25 %, senão misto.",
    col_verdict: "Efeito", col_pw: "Potência / peso", col_dpp: "ΔPP", col_rank: "Posição", col_context: "Contexto após a atualização",
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
    more_about: (x) => `Mais informação sobre ${x}`,
    term_bop: "BoP", term_pp: "PP", term_ps_t: "PS/t", term_balance: "distribuição de peso", term_track_types: "tipos de pista", term_level: "nível", term_estimates: "estas estimativas",
    help_bop: "O BoP (Balance of Performance) é o ajuste de potência e peso que a Polyphony faz para equilibrar os carros de corrida.",
    help_pp: "Pontos de Performance: o número do Gran Turismo que diz quão rápido é um carro. Mais alto significa mais rápido. Dentro de uma classe, o BoP tenta aproximar todos os carros.",
    help_ps_t: "Cavalos por tonelada de peso. Mais alto significa melhor aceleração.",
    help_balance: "Como o peso do carro se divide entre a frente e a traseira, por exemplo 47:53.",
    help_track_types: "Desde a atualização 1.19, cada carro tem três afinações de BoP: uma para pistas rápidas (retas longas, por ex. Monza), uma para pistas médias e uma para pistas lentas e sinuosas (por ex. Tsukuba).",
    help_level: "Onde o carro fica na sua classe: S = 10 % melhores, A = 35 % melhores, B = 70 % melhores, C = restantes.",
    help_estimates: "O desgaste de pneus e o consumo são estimados a partir do peso, binário, tração e potência. Ainda não são medidos.",
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
      p.push(`${b.rank}.º de ${b.of} (nível ${b.tier}), ${b.all_rounder ? `polivalente, com ligeira vantagem em ${set}` : `mais forte em ${set}`}.`);
      if (b.strengths.length) p.push(`Bom em ${b.strengths.map((s) => this.tr[s]).join(", ")}.`);
      p.push(`Desgaste de pneus estimado ${this[b.tyre_wear]}, consumo ${this[b.fuel_use]}.`);
      return p.join(" ");
    },
    about: `<h1>Sobre</h1>
      <p>Acompanha o <b>Balance of Performance</b> do Gran Turismo 7 para Gr.1–Gr.4. Desde a 1.19 o jogo usa três conjuntos de BoP — pistas rápidas, médias e lentas — escolhidos pela pista.</p>
      <h2>Como os carros são avaliados</h2><ul>
      <li><b>Posição / nível</b>: PP dentro da classe em cada conjunto de BoP.</li>
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
