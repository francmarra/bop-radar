# Comparador de carros (React + TS): design

**Data:** 22/10/2026 · **Estado:** aprovado em conversa, aguarda revisão da spec escrita
**Sub-projeto 2 de 4** do projeto-montra (1 API core ✅ · **2 comparador React** · 3 deploy no Azure · 4 bónus LLM).

## Objetivo

Fechar a lacuna "framework frontend" do `MERCADO_SKILLS.md` (React pedido em 3 vagas) com um ecrã real que consome a API .NET do sub-projeto 1. Um recrutador deve ver:
- React com TypeScript idiomático (componentes, hooks, estado no URL);
- data fetching com TanStack Query;
- tipos gerados a partir do OpenAPI da API;
- testes (Vitest + React Testing Library + MSW);
- CI.

**Sucesso:**
- Com a API a correr (`cd api && docker compose up`), `cd web && npm run dev` abre o comparador em `http://localhost:5173`.
- Escolhidos 2 a 4 carros, aparece a tabela lado a lado (melhor valor destacado) e o gráfico do PP ao longo das versões.
- A CI `web` fica verde.

**Restrições:**
- **Só local por agora.** Vai para o ar no sub-projeto 3, quando a API estiver no Azure. Não há mocks em produção.
- O Python, o `site/` e o `update.yml` não mudam. O `api/` só muda no workflow `api.yml` (verificação dos tipos).
- O CORS da API já permite `http://localhost:5173`.

## Decisões tomadas

| Decisão | Escolha | Porquê |
|---|---|---|
| Onde | Pasta `web/` no monorepo; só local | Escolha do Francisco; a API ainda não está online |
| Âmbito | Tabela comparativa + gráfico de PP por versão | Escolha do Francisco; o gráfico mostra fetching paralelo |
| Stack | Vite + React + TypeScript (strict) | Padrão atual; sem SSR (Next.js descartado) |
| Dados | TanStack Query (`useQuery`, `useQueries`) | Cache, loading/erro e cancelamento sem escrever à mão; muito pedido em vagas |
| Tipos | `openapi-typescript` a partir de `/openapi/v1.json` | Os tipos do front ficam alinhados com os DTOs do .NET |
| Gráfico | Componente SVG próprio | Uma linha por carro não justifica uma biblioteca de gráficos |
| Estado | Query string do URL (`URLSearchParams` nativo) | Links partilháveis e botão "voltar"; sem router nem store global |
| Testes | Vitest + React Testing Library + MSW | O MSW simula a rede, por isso os testes passam pelo cliente real |

## Estrutura

```
web/
  package.json, package-lock.json, vite.config.ts, tsconfig.json, eslint.config.js, index.html, .env.example
  src/
    main.tsx, App.tsx, theme.css
    api/schema.d.ts        gerado (npm run gen:api); não editar à mão
    api/client.ts          fetch tipado; base URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080"; erros → ApiError
    api/queries.ts         useCarSearch(q), useUpdates(), useCompare(ids, set, version), useHistories(ids, set)
    state/useCompareParams.ts  lê/escreve ?ids=a,b&set=m&version=1.71 (history.replaceState/pushState)
    lib/best.ts            regra do "melhor valor" por métrica (função pura)
    components/CarPicker.tsx     combobox de pesquisa + chips dos escolhidos
    components/Controls.tsx      set (h/m/l) + versão
    components/CompareTable.tsx  tabela lado a lado
    components/PpChart.tsx       gráfico SVG de linhas
    components/Status.tsx        estados vazio / loading / erro com retry
  src/test/  setup.ts, handlers.ts (MSW), fixtures.ts (respostas com a forma dos DTOs reais)
.github/workflows/web.yml   (novo)
```

## Comportamento

**Estado no URL**
- `ids`: lista separada por vírgulas, 0 a 4, sem repetidos. Uma lista maior é truncada a 4.
- `set`: `h`, `m` ou `l` (por omissão `m`).
- `version`: opcional. Ausente significa "mais recente comum", e a API escolhe.
- Valores inválidos voltam ao valor por omissão.
- Ids que a API não conhece não são retirados automaticamente: o 404 do compare mostra o `detail`, que já diz qual é o id ou a versão em falta, e o utilizador remove o chip. Tirar o id do texto do `detail` seria frágil.

**CarPicker**
- A pesquisa usa debounce de 250 ms e chama `GET /api/v1/cars?q=<texto>&pageSize=10`. Só pesquisa com 2 ou mais caracteres.
- Cada resultado mostra o nome, a marca e o grupo.
- Escolher um resultado acrescenta-o como chip; chegado aos 4, a pesquisa fica desativada com o texto "Máximo 4 carros".
- Cada chip tem um botão "remover" com aria-label.
- Combobox ARIA (`role=combobox`, `listbox`, `aria-activedescendant`), navegável por teclado: setas, Enter e Esc.

**Controls**
- `set`: grupo de 3 botões de rádio, H/M/L.
- Versão: `<select>` com "Mais recente comum" seguido das versões de `GET /api/v1/updates`, ordenadas por data descendente, como a API as devolve.

**CompareTable** (dados de `GET /api/v1/compare?ids&set&version`)
- Uma coluna por carro, pela ordem do pedido.
- Linhas: grupo, rank, tier, PP, potência (PS), binário (kgfm), peso (kg), PS/t e balance.
- O caption indica a versão usada e o set.
- O **melhor valor** é calculado por `lib/best.ts`:
  - maior é melhor: PP, potência, binário, PS/t;
  - menor é melhor: peso, rank;
  - sem destaque: tier, balance, grupo;
  - empates são todos destacados;
  - `null` (o `psPerT` que falta) mostra "—" e não conta;
  - destaque com cor + ícone + texto escondido "melhor", para não depender só da cor.

**PpChart** (dados de `GET /api/v1/cars/{id}/history?set=`, um pedido por carro em paralelo)
- Eixo X: versões por data, com a união das versões de todos os carros.
- Eixo Y: PP, com uma linha por carro (cor e legenda).
- Carros sem ponto numa versão ficam com a linha interrompida, sem interpolação.
- `role="img"` + `aria-label` descritivo. A tabela é a alternativa acessível.
- SVG responsivo (`viewBox`, largura 100%).

**Estados e erros** (`Status.tsx`)
- Com menos de 2 carros: "Escolhe 2 a 4 carros para comparar". Não há pedidos de compare nem de histórico.
- Loading: skeleton com `aria-busy="true"` na região.
- `ApiError` com status 404 ou 400: mostra o `detail` ou `title` do ProblemDetails.
- Erro de rede: "Não foi possível ligar à API (<base URL>). Está a correr `docker compose up` em api/?", com o botão "Tentar outra vez" (`refetch`).

**Aspeto e acessibilidade**
- `theme.css` copia as variáveis de `site/style.css`: cores, `--mono`, `--head`, `--radius`, `--tap`. Tem tema escuro por omissão e claro via `prefers-color-scheme: light`.
- Fontes iguais às do site (Barlow Condensed e JetBrains Mono, via Google Fonts).
- Contraste AA, foco visível, alvos de 44 px e tabela com `<caption>` e `<th scope>`.
- Layout responsivo: em ecrãs estreitos a tabela faz scroll horizontal dentro do seu contentor, nunca a página toda.

**Fora (YAGNI):** router, Redux/Zustand, i18n EN/PT (UI só em inglês, como o site), PWA, deploy e escolha de cores dos carros pelo utilizador.

## Testes

- **Unitários (Vitest):**
  - `best.ts`: direção por métrica, empates, `null` ignorado, um só carro com valor;
  - `useCompareParams`: parse, truncagem a 4, repetidos, `set` inválido → `m`, escrita no URL.
- **Componentes (RTL + MSW, cliente real):**
  - escolher 2 carros pelo picker → a tabela mostra os dois e o melhor PP fica marcado como "melhor";
  - mudar o set para H faz novo pedido com `set=h`;
  - com um 404 da API aparece o texto do `detail`;
  - com erro de rede aparece a mensagem, e "Tentar outra vez" volta a pedir e mostra os dados;
  - o gráfico desenha N `<path>` para N carros;
  - o picker chega a 4 e fica desativado;
  - navegação por teclado no picker (setas + Enter).
- **Tipos:** `tsc --noEmit` (strict).
- **Deriva dos tipos:** o `api.yml` ganha um passo que arranca a API (sem precisar de BD para `/openapi/v1.json`), corre `npx openapi-typescript` e falha se o resultado for diferente do `web/src/api/schema.d.ts` do repo.

## CI

- **`web.yml`** (novo):
  - gatilhos: push e pull_request com `paths: [web/**, .github/workflows/web.yml]`;
  - em `ubuntu-latest`: `actions/setup-node` com Node 22 e cache npm, `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build` (dentro de `web/`).
- **`api.yml`**: acrescenta o passo de deriva dos tipos. Também corre quando `web/src/api/schema.d.ts` muda (acrescentado aos `paths`).

## Documentação

Secção "Car comparator (React)" no `README.md`, em inglês, como o resto:
- o que é;
- como correr (API com `docker compose up`, depois `cd web && npm install && npm run dev`);
- `npm run gen:api`;
- os testes;
- um screenshot em `docs/img/compare.png`.

## Riscos

- **A API muda os DTOs:** a verificação de deriva no `api.yml` apanha-o.
- **O tamanho do `package-lock.json`** é normal num projeto React e fica no repo.
- **Versões das dependências:** usar as estáveis atuais (React 19, Vite, TanStack Query 5, Vitest, MSW 2), fixadas pelo lockfile.
