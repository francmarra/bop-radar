# Interface mais simples (mobile-first): design

**Data:** 26/10/2026 · **Estado:** aprovado em conversa, aguarda revisão da spec escrita

## Objetivo

Tornar o site (`site/`) mais simples e fácil de usar, sobretudo no telemóvel, sem mudar a identidade visual.

**Problemas (escolhidos pelo Francisco):** navegação confusa, mau no telemóvel, demasiada informação.
O visual cromado/escuro **não** é problema e mantém-se.

**Tarefas principais (todas ao mesmo nível):** ranking por classe · que carro usar esta semana ·
o que mudou no último BoP · encontrar o meu carro.

**O que se viu a 390 px (antes):**
- O menu passa a largura do ecrã: "BoP updates" cortado, "Help" invisível.
- Ranking: ~150 px por carro → 3 carros por ecrã; etiquetas "Estimate" e `[S]` fazem ruído.
- Página do carro: ~3100 px, tudo ao mesmo nível (ficha, gráfico, tabela, track fit, pontos fortes/fracos, pneus/combustível).

**Sucesso:**
- A 390 px não há scroll horizontal; as 4 tarefas estão a um toque em qualquer página.
- Ranking: ~10 carros por ecrã a 390 × 844.
- Página do carro com as secções fechadas: ≤ ~1200 px a 390 px.
- `node --test "tests/js/*.test.mjs"` e `uv run pytest` verdes; Lighthouse acessibilidade e SEO continuam a 100.

**Restrições:**
- URLs iguais (sem rotas novas): pré-render, sitemap e SEO não mudam.
- Nenhum dado é removido: o secundário passa para secções recolhidas.
- Mantém-se EN/PT, tema claro/escuro, contraste AA, letra base 18 px, `prefers-reduced-motion`.
- Sem dependências novas e sem passo de build (vanilla JS, como hoje).
- `api/`, `web/`, Python do pipeline e `update.yml` não mudam.

## Decisões tomadas

| Decisão | Escolha | Porquê |
|---|---|---|
| Abordagem | Arrumação mobile-first (1 de 3: painel único / só CSS) | Resolve os 3 problemas sem mexer em rotas, pré-render ou SEO |
| Navegação no telemóvel | Barra fixa em baixo com 4 separadores | As 4 tarefas a um toque; padrão conhecido em apps |
| Ajuda | Sai do menu → rodapé + ⓘ | É secundária; liberta espaço |
| Tema + língua | Botão ⚙ com painel pequeno | Cabeçalho mais limpo |
| Linhas de carros | Um helper partilhado (`js/row.js`) | Ranking, semana, atualizações e pistas ficam iguais |
| Secções recolhidas | `<details>`/`<summary>` nativos | Acessível, sem JS, funciona no HTML pré-renderizado |

## Design

### 1. Navegação e estrutura

**Telemóvel (< 768 px):**
- Cabeçalho fino: logo (→ início) + botão ⚙ (`aria-expanded`, abre painel com tema claro/escuro e EN/PT; fecha com Escape ou clique fora).
- Barra fixa em baixo, 4 separadores com ícone + texto: **Semana** (`week/`), **Ranking** (`ranking/`),
  **BoP** (`updates/`), **Pesquisa** (botão que abre a pesquisa em ecrã inteiro).
  Separador ativo com `aria-current="page"`; altura ≥ 56 px; `padding-bottom: env(safe-area-inset-bottom)`;
  o `main` ganha padding em baixo para a barra não tapar conteúdo.
- Pesquisa em ecrã inteiro: input focado ao abrir, foco preso dentro do painel, Escape fecha e devolve o foco ao botão.
  Reutiliza a lógica de `js/search.js`.

**Desktop (≥ 768 px):** menu no topo com as mesmas 4 entradas; pesquisa como campo no cabeçalho; sem barra em baixo.

**Ajuda:** link no rodapé; os ⓘ continuam a apontar para `help/`. A rota `help/` mantém-se.

O cabeçalho vive no `index.html` (shell), que a pré-renderização (`render.py: page_html`) reutiliza — todas as páginas herdam a mudança.

### 2. Início e Ranking

**Início:** topo igual (título, pesquisa, n.º 1 da classe). Por baixo, 3 cartões (sai o de Ajuda):
- **Esta semana:** corridas A/B/C, cada uma com o melhor carro recomendado ao lado.
- **Ranking:** líder de cada classe (como hoje).
- **Último BoP:** uma linha — versão · data · "▲ X mais rápidos · ▼ Y mais lentos".

**Ranking:**
- Linha compacta (~64 px): posição · miniatura · nome numa linha (reticências) + marca em letra pequena ·
  nível S/A/B/C · seta ▲/▼/◆ do último BoP.
- "Estimate" passa a asterisco no nível (`S*`), com legenda no topo: "* estimativa, poucos dados de corrida".
  O asterisco tem texto acessível (`aria-label`/`title`).
- Seletores de classe (Gr.1–4) e tipo de pista ficam `position: sticky` no topo durante o scroll.
- Tocar na linha abre a página do carro (link na linha inteira).

### 3. Página do carro, Semana, Atualizações, Pistas

**Carro:**
- Resumo no topo: imagem, nome, classe · marca · tração, posição e nível (ex. `P19/26 · C`),
  efeito do último BoP (▼ +10 kg), 4 números (potência, peso, PS/t, PP) e a frase-resumo atual.
- Secções `<details>`:
  - **Histórico do BoP** (gráfico + tabela de mudanças) — aberta;
  - **Desempenho por tipo de pista** (track fit + pontos fortes/fracos) — fechada;
  - **Detalhes técnicos** (equilíbrio F:R, handling) — fechada;
  - **Pneus e combustível (estimativa)** — fechada.

**Semana:** um cartão por corrida (pista, regras numa linha, carros recomendados com a linha compacta);
"porquê" e regras completas em `<details>`.

**Atualizações:** lista com uma linha por versão (data · ▲ X · ▼ Y · link); página da versão com os carros
agrupados por classe na linha compacta.

**Pistas:** passam a usar a linha compacta; nada mais muda.

### 4. Implementação

Ficheiros: `site/index.html`, `site/style.css`, `site/js/search.js`, `site/js/row.js` (novo),
`site/js/pages/{home,ranking,car,week,updates,tracks}.js`, `site/js/main.js` (⚙, barra, `aria-current`),
`site/js/i18n.js` (textos novos EN + PT). `src/gt7bop/render.py` só se algum teste depender do menu antigo.

Fases (um commit cada, branch `feat/simple-ui`):
1. Navegação (cabeçalho, ⚙, barra em baixo, pesquisa em ecrã inteiro).
2. Linha compacta (`row.js`) + Ranking.
3. Página do carro com `<details>`.
4. Início, Semana, Atualizações, Pistas.

## Testes

- `node --test "tests/js/*.test.mjs"`: novo teste para `row.js` (nível com/sem asterisco, setas, escape do nome);
  paridade EN/PT dos textos novos (`i18n.test.mjs`); cores novas no `contrast.test.mjs`.
- `uv run pytest` verde (inclui `test_render.py`).
- Capturas antes/depois a 390 × 844 e 1280 × 800 (início, ranking, carro, semana).
- Revisão com a skill `web-design-guidelines` e Lighthouse (acessibilidade e SEO = 100).

## Riscos

- Barra em baixo a tapar conteúdo ou o teclado → padding no `main`; barra escondida enquanto a pesquisa está aberta.
- Foco na pesquisa em ecrã inteiro → focus trap + Escape + devolver foco.
- Testes JS que esperem o markup antigo → atualizar no mesmo commit da fase.

## Fora de âmbito

Mudar o estilo visual, novas rotas, novos dados, PWA, comparador no site estático.
