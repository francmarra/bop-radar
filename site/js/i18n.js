/* Strings EN/PT and t(). DOM-free. */
export const I18N = {
  en: {
    nav_rankings: "Rankings", nav_tracks: "Tracks", nav_updates: "BoP updates", nav_about: "About", nav_home: "Home", nav_help: "Help", skip: "Skip to content", theme_toggle: "Switch light/dark theme",
    loading: "Loading…", load_error: "We couldn't load the data. Check your connection and try again.", retry: "Try again", latest: "Latest BoP update", bop_explain: "BoP (Balance of Performance) is the power and weight adjustment Polyphony makes to keep race cars even.", version: "Version",
    see_changes: "See all changes", no_change: "no change", search_car: "Search car or maker…", search_track: "Search track…",
    track_type: "Track type", set_h: "Fast tracks", set_m: "Medium tracks", set_l: "Slow tracks",
    set_h_long: "High-speed tracks", set_m_long: "Mid-speed tracks", set_l_long: "Low-speed tracks",
    col_car: "Car", col_pp: "Performance level (PP)", col_best: "Best track type", col_last: "Last change", col_traits: "Strengths", col_tier: "Level",
    level_S: "S: among the best", level_A: "A: strong", level_B: "B: average", level_C: "C: weaker",
    rank_note: "Position = real lap pace in Daily Races on tracks of this type, when the car appears in the leaderboards (top 1000 laps) of at least 2 of them with its current BoP. Otherwise it is our estimate from BoP data (marked \"Estimate\"). Levels: S = top 10 %, A = top 35 %, B = top 70 %, C = the rest.", src_pace: (n) => `Real pace · ${n} ${n === 1 ? "track" : "tracks"}`, col_pp_rank: "PP rank",
    no_match: "No cars match.", find_car: "Which car for which track?", find_car_sub: "Pick a track and a class to see the best cars, from real leaderboard times.",
    pick_track: "Choose a track", go: "Show cars", tyres: "Tyres", fuel: "Fuel", tyre_wear: "Tyre wear", fuel_use: "Fuel use",
    buff: "Faster", nerf: "Slower", mixed: "Mixed", unchanged: "Unchanged", first_seen: "First appearance",
    pp_only: "PP only", bop_of: (s) => `${s} BoP`,
    updates_title: "BoP updates", updates_sub: "Every game version that changed power or weight of a Gr.1–4 car.",
    cars_changed: (n) => `${n} cars changed`, update_note: "Effect = average change in power-to-weight across the BoP sets that changed: faster above +0.25 %, slower below −0.25 %, otherwise mixed.",
    col_verdict: "Effect", col_pw: "Power / weight", col_dpp: "ΔPP", col_rank: "Rank", col_context: "Context after update",
    back_rank: (g) => `← ${g} rankings`, ctx_title: (v, d) => `Performance at ${v} (${d})`, ctx_hint: "Pick a version to see how the car was at that time.",
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
    term_bop: "BoP", term_pp: "PP", term_ps_t: "PS/t", term_balance: "weight balance", term_track_types: "track types", term_level: "level", term_estimates: "tyre wear and fuel estimates",
    help_bop: "BoP (Balance of Performance) is the power and weight adjustment Polyphony makes to keep race cars even.",
    help_pp: "Performance Points: Gran Turismo's single number for how fast a car is. Higher means faster. Within a class, BoP tries to bring every car close.",
    help_ps_t: "Horsepower per tonne of weight. Higher means stronger acceleration.",
    help_balance: "How the car's weight is split between front and rear, for example 47:53.",
    term_balance_idx: "balance index", help_balance_idx: "How many cars really compete at the top of the Daily Races (top 100 laps). 1.0 means one car sets almost every lap; 5 means the laps are spread as if five cars were equally popular. Higher means a better balanced BoP.",
    bal_update: (n, e) => `Balance in the Daily Races: ${n} effective cars (${e} ${e === 1 ? "race" : "races"})`, bal_prev: (n) => `before: ${n}`, bal_race: (n) => `Balance this week: ${n} effective cars`,
    help_track_types: "Since update 1.19 each car has three BoP settings: one for fast tracks (long straights, e.g. Monza), one for medium tracks and one for slow, twisty tracks (e.g. Tsukuba).",
    help_level: "Where the car sits in its class, based on real lap times from Daily Races on this type of track (or our estimate when there are not enough races): S = top 10 %, A = top 35 %, B = top 70 %, C = the rest.",
    help_estimates: "Tyre wear and fuel use are estimated from weight, torque, drivetrain and power. They are not measured yet.",
    cls_full_buff: (n) => `${n} ${n === 1 ? "car" : "cars"} got faster`, cls_full_nerf: (n) => `${n} ${n === 1 ? "car" : "cars"} got slower`, cls_full_mixed: (n) => `${n} ${n === 1 ? "car" : "cars"} had mixed changes`,
    cls_short_buff: (n) => `${n} faster`, cls_short_nerf: (n) => `${n} slower`, cls_short_mixed: (n) => `${n} mixed`, cls_none: (g) => `No changes for ${g}`,
    home_title: "How did BoP change your car?", find_label: "Find your car", find_ph: "e.g. Ferrari 296", find_empty: "No car found for «{q}». Try just the maker, e.g. «Ferrari».",
    most_affected: "Biggest changes", ranking_title: "Cars by class", date_fmt: "Released",
    chart_alt: (a, b, n) => `Performance level (PP) on medium tracks went from ${a} to ${b} over ${n} game versions.`, no_changes: (v) => `No BoP changes yet since version ${v}.`,
    help_title: "Help", how_title: "How to use the site",
    step1: "Find your car: type its name or maker in the big search box on the home page.",
    step2: "Read what changed: the car page starts with a plain summary and its BoP history.",
    step3: "Compare with its class: the ranking on the home page shows where each car sits.",
    glossary_title: "Words used on this site", data_title: "Where the data comes from",
    data_text: 'BoP values come from <a href="https://gt-engine.com/gt7/">GT ENG!NE</a>, which records every Gran Turismo 7 update since 1.15. This site checks for new updates every Monday.',
    privacy_text: "Visits are counted anonymously with GoatCounter: no cookies and no personal data.",
    generated: "Last updated", not_official: "This is a fan-made site, not affiliated with Polyphony Digital or Sony.",
    nav_week: "This week", week_title: "This week's Daily Races", this_week: "This week", next_week: "Next week",
    week_strip: "This week's Daily Races", one_make_label: "One-make", stale_note: (d) => `This guide may be out of date: it was last updated on ${d}.`, see_guide: "See the full guide", best_bet: "Best bet", top5: "Top 5 cars",
    src_live: (p) => `This week: ${p}% of the top 100`, src_real: (n) => `Earlier races (${n} laps)`, src_est: "Estimate", one_make: (c) => `Everyone drives the same car: ${c}`,
    other_race: "BoP does not apply to this race. Pick any car within the PP limit.",
    tbd_race: (d) => `The class is announced when the race starts${d ? ` (${d})` : ""}.`,
    next_empty: "Next week's races aren't out yet. They usually appear mid-week.", no_track_data: "No data for this track yet.",
    copy: "Copy summary", copied: "Copied!", copy_manual: "Copy this text:", summary_best: "best", and: "and", saves_tyres: "saves tyres",
    rules_tyres: (x) => `Tyres: ${x}`, rules_fuel: (n) => `Fuel ×${n}`, rules_wear: (n) => `Tyre wear ×${n}`, race_letter: (l) => `Race ${l}`,
    term_fuel_x: "fuel multiplier", term_wear_x: "tyre wear multiplier",
    help_fuel_x: "How much faster than normal the car burns fuel in this race. ×2 means twice as fast, so you may need to save fuel or pit.",
    help_wear_x: "How much faster than normal the tyres wear out in this race. ×5 means five times faster, so cars that are gentle on tyres do better.",
    tyre_RH: "Racing Hard", tyre_RM: "Racing Medium", tyre_RS: "Racing Soft", tyre_IM: "Intermediate", tyre_W: "Heavy Wet",
    tyre_CH: "Comfort Hard", tyre_CM: "Comfort Medium", tyre_CS: "Comfort Soft", tyre_SH: "Sports Hard", tyre_SM: "Sports Medium", tyre_SS: "Sports Soft",
    img_credit: "Car images © Polyphony Digital Inc. / Sony Interactive Entertainment",
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
  },
  pt: {
    nav_rankings: "Rankings", nav_tracks: "Pistas", nav_updates: "Atualizações", nav_about: "Sobre", nav_home: "Início", nav_help: "Ajuda", skip: "Saltar para o conteúdo", theme_toggle: "Mudar tema claro/escuro",
    loading: "A carregar…", load_error: "Não foi possível carregar os dados. Verifica a ligação e tenta outra vez.", retry: "Tentar outra vez", latest: "Última atualização de BoP", bop_explain: "O BoP (Balance of Performance) é o ajuste de potência e peso que a Polyphony faz para equilibrar os carros de corrida.", version: "Versão",
    see_changes: "Ver todas as alterações", no_change: "sem alterações", search_car: "Procurar carro ou marca…", search_track: "Procurar pista…",
    track_type: "Tipo de pista", set_h: "Pistas rápidas", set_m: "Pistas médias", set_l: "Pistas lentas",
    set_h_long: "Pistas rápidas", set_m_long: "Pistas médias", set_l_long: "Pistas lentas",
    col_car: "Carro", col_pp: "Nível de performance (PP)", col_best: "Melhor tipo de pista", col_last: "Última alteração", col_traits: "Pontos fortes", col_tier: "Nível",
    level_S: "S: dos melhores", level_A: "A: forte", level_B: "B: médio", level_C: "C: mais fraco",
    rank_note: "Posição = ritmo real nas Daily Races em pistas deste tipo, quando o carro aparece nas leaderboards (top 1000 voltas) de pelo menos 2 delas com o BoP atual. Caso contrário, é a nossa estimativa a partir do BoP (marcada \"Estimativa\"). Níveis: S = 10 % melhores, A = 35 % melhores, B = 70 % melhores, C = restantes.", src_pace: (n) => `Ritmo real · ${n} ${n === 1 ? "pista" : "pistas"}`, col_pp_rank: "Posição por PP",
    no_match: "Nenhum carro encontrado.", find_car: "Que carro para que pista?", find_car_sub: "Escolhe a pista e a classe para ver os melhores carros, com base em tempos reais das leaderboards.",
    pick_track: "Escolhe uma pista", go: "Ver carros", tyres: "Pneus", fuel: "Combustível", tyre_wear: "Desgaste de pneus", fuel_use: "Consumo",
    buff: "Mais rápido", nerf: "Mais lento", mixed: "Misto", unchanged: "Sem alteração", first_seen: "Primeira aparição",
    pp_only: "só PP", bop_of: (s) => `BoP ${s.toLowerCase()}`,
    updates_title: "Atualizações de BoP", updates_sub: "Todas as versões do jogo que mudaram potência ou peso de um carro Gr.1–4.",
    cars_changed: (n) => `${n} carros alterados`, update_note: "Efeito = variação média da relação potência/peso nos conjuntos de BoP alterados: mais rápido acima de +0,25 %, mais lento abaixo de −0,25 %, senão misto.",
    col_verdict: "Efeito", col_pw: "Potência / peso", col_dpp: "ΔPP", col_rank: "Posição", col_context: "Contexto após a atualização",
    back_rank: (g) => `← Rankings ${g}`, ctx_title: (v, d) => `Performance na ${v} (${d})`, ctx_hint: "Escolhe uma versão para ver como o carro estava nessa altura.",
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
    term_bop: "BoP", term_pp: "PP", term_ps_t: "PS/t", term_balance: "distribuição de peso", term_track_types: "tipos de pista", term_level: "nível", term_estimates: "estimativas de pneus e combustível",
    help_bop: "O BoP (Balance of Performance) é o ajuste de potência e peso que a Polyphony faz para equilibrar os carros de corrida.",
    help_pp: "Pontos de Performance: o número do Gran Turismo que diz quão rápido é um carro. Mais alto significa mais rápido. Dentro de uma classe, o BoP tenta aproximar todos os carros.",
    help_ps_t: "Cavalos por tonelada de peso. Mais alto significa melhor aceleração.",
    help_balance: "Como o peso do carro se divide entre a frente e a traseira, por exemplo 47:53.",
    term_balance_idx: "índice de equilíbrio", help_balance_idx: "Quantos carros disputam mesmo o topo das Daily Races (top 100 voltas). 1.0 quer dizer que um carro faz quase todas as voltas; 5 quer dizer que as voltas se repartem como se cinco carros fossem igualmente populares. Quanto mais alto, mais equilibrado está o BoP.",
    bal_update: (n, e) => `Equilíbrio nas Daily Races: ${n} carros efetivos (${e} ${e === 1 ? "corrida" : "corridas"})`, bal_prev: (n) => `antes: ${n}`, bal_race: (n) => `Equilíbrio esta semana: ${n} carros efetivos`,
    help_track_types: "Desde a atualização 1.19, cada carro tem três afinações de BoP: uma para pistas rápidas (retas longas, por ex. Monza), uma para pistas médias e uma para pistas lentas e sinuosas (por ex. Tsukuba).",
    help_level: "Onde o carro fica na sua classe, com base em tempos reais das Daily Races neste tipo de pista (ou na nossa estimativa quando não há corridas suficientes): S = 10 % melhores, A = 35 % melhores, B = 70 % melhores, C = restantes.",
    help_estimates: "O desgaste de pneus e o consumo são estimados a partir do peso, binário, tração e potência. Ainda não são medidos.",
    cls_full_buff: (n) => n === 1 ? "1 carro ficou mais rápido" : `${n} carros ficaram mais rápidos`, cls_full_nerf: (n) => n === 1 ? "1 carro ficou mais lento" : `${n} carros ficaram mais lentos`, cls_full_mixed: (n) => n === 1 ? "1 carro com alterações mistas" : `${n} carros com alterações mistas`,
    cls_short_buff: (n) => n === 1 ? "1 mais rápido" : `${n} mais rápidos`, cls_short_nerf: (n) => n === 1 ? "1 mais lento" : `${n} mais lentos`, cls_short_mixed: (n) => n === 1 ? "1 misto" : `${n} mistos`, cls_none: (g) => `Sem alterações no ${g}`,
    home_title: "Como é que o BoP mudou o teu carro?", find_label: "Procura o teu carro", find_ph: "por ex. Ferrari 296", find_empty: "Nenhum carro encontrado para «{q}». Experimenta só a marca, por ex. «Ferrari».",
    most_affected: "Maiores alterações", ranking_title: "Carros por classe", date_fmt: "Publicada",
    chart_alt: (a, b, n) => `O nível de performance (PP) em pistas médias passou de ${a} para ${b} ao longo de ${n} versões do jogo.`, no_changes: (v) => `Ainda sem alterações de BoP desde a versão ${v}.`,
    help_title: "Ajuda", how_title: "Como usar o site",
    step1: "Procura o teu carro: escreve o nome ou a marca na caixa de pesquisa grande da página inicial.",
    step2: "Lê o que mudou: a página do carro começa com um resumo simples e o histórico de BoP.",
    step3: "Compara com a classe: o ranking da página inicial mostra onde fica cada carro.",
    glossary_title: "Palavras usadas neste site", data_title: "De onde vêm os dados",
    data_text: 'Os valores de BoP vêm do <a href="https://gt-engine.com/gt7/">GT ENG!NE</a>, que regista todas as atualizações do Gran Turismo 7 desde a 1.15. Este site procura novas atualizações todas as segundas-feiras.',
    privacy_text: "As visitas são contadas de forma anónima com o GoatCounter: sem cookies e sem dados pessoais.",
    generated: "Última atualização", not_official: "Este é um site feito por fãs, sem ligação à Polyphony Digital ou à Sony.",
    nav_week: "Esta semana", week_title: "Daily Races desta semana", this_week: "Esta semana", next_week: "Próxima semana",
    week_strip: "Daily Races desta semana", one_make_label: "Marca única", stale_note: (d) => `Este guia pode estar desatualizado: foi atualizado pela última vez a ${d}.`, see_guide: "Ver o guia completo", best_bet: "Melhor aposta", top5: "Os 5 melhores carros",
    src_live: (p) => `Esta semana: ${p}% do top 100`, src_real: (n) => `Corridas anteriores (${n} voltas)`, src_est: "Estimativa", one_make: (c) => `Todos usam o mesmo carro: ${c}`,
    other_race: "O BoP não se aplica a esta corrida. Escolhe um carro dentro do limite de PP.",
    tbd_race: (d) => `A classe é anunciada quando a corrida começar${d ? ` (${d})` : ""}.`,
    next_empty: "As corridas da próxima semana ainda não saíram. Normalmente aparecem a meio da semana.", no_track_data: "Ainda não há dados para esta pista.",
    copy: "Copiar resumo", copied: "Copiado!", copy_manual: "Copia este texto:", summary_best: "melhores", and: "e", saves_tyres: "poupa pneus",
    rules_tyres: (x) => `Pneus: ${x}`, rules_fuel: (n) => `Combustível ×${n}`, rules_wear: (n) => `Desgaste ×${n}`, race_letter: (l) => `Corrida ${l}`,
    term_fuel_x: "multiplicador de combustível", term_wear_x: "multiplicador de desgaste",
    help_fuel_x: "Quanto mais depressa que o normal o carro gasta combustível nesta corrida. ×2 significa o dobro, por isso podes ter de poupar ou ir às boxes.",
    help_wear_x: "Quanto mais depressa que o normal os pneus se gastam nesta corrida. ×5 significa cinco vezes mais, por isso os carros que poupam pneus ganham vantagem.",
    tyre_RH: "Corrida Duros", tyre_RM: "Corrida Médios", tyre_RS: "Corrida Macios", tyre_IM: "Intermédios", tyre_W: "Chuva",
    tyre_CH: "Conforto Duros", tyre_CM: "Conforto Médios", tyre_CS: "Conforto Macios", tyre_SH: "Desportivos Duros", tyre_SM: "Desportivos Médios", tyre_SS: "Desportivos Macios",
    img_credit: "Imagens dos carros © Polyphony Digital Inc. / Sony Interactive Entertainment",
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
