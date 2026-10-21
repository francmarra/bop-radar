# BoP Radar API (.NET): design

**Data:** 21/10/2026 · **Estado:** aprovado em conversa, aguarda revisão da spec escrita
**Sub-projeto 1 de 4** do projeto-montra (1 API core · 2 comparador React+TS · 3 deploy no Azure · 4 bónus LLM). Cada sub-projeto tem spec, plano e implementação próprios.

## Objetivo

Mostrar no GitHub, num projeto real, as skills que as vagas júnior .NET mais pedem e o Francisco ainda não tem (ver `Desktop\Procura de Emprego\04-Candidaturas\MERCADO_SKILLS.md`): **REST Web API, testes automatizados, Docker, CI/CD**, e ainda EF Core + PostgreSQL.

**Sucesso:**
- `docker compose up` dentro de `api/` põe a API a correr com os dados reais do bop-radar.
- A CI fica verde com testes unitários e de integração.
- O README explica a arquitetura e dá exemplos de chamadas, para um recrutador perceber em 2 minutos.

**Restrições:**
- O pipeline Python, o `site/` e o workflow `update.yml` **não mudam**. O site no GitHub Pages continua igual.
- O pipeline Python é a fonte de verdade. A API é só uma leitura derivada do `site/data`.
- A API é só de leitura: sem autenticação e sem escrita.

## Decisões tomadas

| Decisão | Escolha | Porquê |
|---|---|---|
| Onde | Pasta `api/` no repo `bop-radar` (monorepo) | Escolha do Francisco |
| Ingestão | Importador em C# lê `site/data/*.json` e faz upsert no PostgreSQL (opção A) | Fica tudo em .NET; o Python não é tocado |
| Escrita | Nenhuma (só GET) | YAGNI: escrita exigiria autenticação e inventaria uma feature |
| Docker | Docker Desktop instalado localmente (winget) | Testcontainers e compose também no PC |
| Runtime | .NET 9 (SDK 9.0.300 instalado) | Versão atual; o SDK 7 está fora de suporte |

## Estrutura

```
api/
  BopRadar.sln
  src/BopRadar.Data/       entidades, BopRadarDbContext, migrações EF Core, Import/ (leitura JSON + upsert)
  src/BopRadar.Api/        Minimal API: Program.cs, Endpoints/ (um ficheiro por recurso), Dtos/, comando "import"
  tests/BopRadar.Tests/    Unit/ + Integration/ + fixtures/ (subconjunto real do site/data)
  Dockerfile
  docker-compose.yml
.github/workflows/api.yml  (novo)
```

São 3 projetos e não uma clean architecture com 5 camadas: a separação entre dados e API chega para este tamanho.

## Modelo de dados (PostgreSQL, EF Core code-first, nomes em snake_case)

| Tabela | Chave | Campos | Origem |
|---|---|---|---|
| `cars` | `id` (slug) | name, maker, drivetrain, group | `cars/<id>.json` (raiz) |
| `bop_updates` | `version` | date | `index.json` → `updates[]` + `history[].v/date` |
| `car_bop_entries` | (car_id, version, set) | changed, rank, tier, pp, power_ps, torque_kgfm, weight_kg, balance, acc_100_150, rotg_60/120/240, stab_low/high (+ flags) | `cars/<id>.json` → `history[].sets.{h,m,l}` |
| `car_update_notes` | (car_id, version) | summary (texto), context (**jsonb**) | `history[].summary`, `history[].context` |
| `update_changes` | (version, car_id) | verdict, delta, rank, summary, brief | `updates/<v>.json` → `groups.<g>[]` |
| `tracks` | `id` | name, set, stats (**jsonb**, por grupo) | `tracks.json` |

- As colunas sobre as quais se filtra, ordena ou compara ficam normalizadas, com índices em `cars.group`, `cars.maker` e `car_bop_entries(car_id, set, version)`.
- Os blocos aninhados que só se devolvem tal como estão (`context`, estatísticas das pistas) ficam em jsonb.
- `set` é um texto restrito a `h`, `m` ou `l` (check constraint). O significado vem do pipeline Python e o importador não o interpreta.
- **Fora:** `week.json` (dados ao vivo e de curta duração), `og/` e as imagens.
- Os campos do JSON que não estão mapeados acima são ignorados. Um campo novo no Python não parte a importação, mas um campo obrigatório em falta sim.

## Importador

- É chamado com `dotnet BopRadar.Api.dll import <pasta site/data>` ou com `dotnet run --project src/BopRadar.Api -- import ../site/data`.
- Antes de importar aplica as migrações pendentes.
- Lê todos os `cars/*.json` (incluindo carros que já não estão no `index.json`, como o `vantage-gr-4`), `updates/*.json`, `index.json` e `tracks.json`.
- Escreve **numa só transação**, com upsert pela chave natural. Correr duas vezes dá o mesmo resultado (idempotente).
- Linhas que deixaram de existir na origem são apagadas: a BD espelha exatamente o `site/data`.
- Erros como ficheiro em falta, JSON inválido ou campo obrigatório em falta param a importação com uma mensagem que diz qual é o ficheiro e o campo, e fazem rollback. Um ficheiro mau nunca deixa a BD a meio.

## API (todos GET, prefixo `/api/v1`)

| Endpoint | Devolve |
|---|---|
| `/cars?group=&maker=&q=&page=1&pageSize=20` | `{ items, page, pageSize, total }`. Cada item tem id, name, maker, group e rank/tier/pp atuais do set `m` |
| `/cars/{id}` | detalhe + estado na última versão para cada set + nota (summary/context) da última versão |
| `/cars/{id}/history?set=m` | série por versão: version, date, changed, pp, power_ps, weight_kg, rank, tier |
| `/updates` | versões por data descendente: version, date, n.º de alterações por grupo |
| `/updates/{version}` | alterações por carro: car_id, name, verdict, delta, rank, summary |
| `/compare?ids=a,b[,c,d]&version=&set=m` | 2 a 4 carros lado a lado. Sem `version` usa a última em que todos existem |
| `/tracks` · `/tracks/{id}` | lista (id, name, set) · detalhe com as estatísticas |
| `/health` | 200 se a BD responde, 503 se não |

- Minimal APIs agrupadas por recurso (`MapGroup`). Os DTOs são `record`s e as entidades nunca são serializadas.
- Leituras com `AsNoTracking` e projeção direta para DTO com `Select`.
- OpenAPI via `Microsoft.AspNetCore.OpenApi` (.NET 9), com UI **Scalar** em `/docs`.
- CORS: GET a partir de `https://francmarra.github.io` e de `http://localhost:5173` (o futuro frontend React).
- **Erros em ProblemDetails (RFC 9457):**
  - `404`: id, versão ou pista inexistente.
  - `400`: validação falhada. Casos: `compare` com menos de 2 ou mais de 4 ids, ou com ids repetidos; `set` fora de h/m/l; `page` < 1; `pageSize` fora de 1–100.
  - `500`: mensagem genérica, sem detalhes internos. O erro completo vai para o log (`ILogger`).
- A configuração vem de `ConnectionStrings__Default` (variável de ambiente), sem segredos no repo.

**Fora (YAGNI):** autenticação, endpoints de escrita, cache distribuída, rate limiting e versionamento além do `v1` no prefixo.

## Testes (xUnit)

- **Unitários**, sem BD: mapeamento JSON → entidades com as fixtures; validação de parâmetros; cálculo da "última versão comum" do `compare`.
- **Integração**, com Testcontainers e PostgreSQL real, mais `WebApplicationFactory`:
  - importar as fixtures duas vezes dá contagens iguais;
  - um carro removido das fixtures desaparece na reimportação;
  - JSON inválido faz rollback (a BD fica como estava);
  - cada endpoint devolve 200 com a forma esperada;
  - 404 e 400 devolvem ProblemDetails;
  - paginação e filtros (`group`, `maker`, `q`).
- **Fumo com os dados reais**: importa o `site/data` completo. O n.º de carros na BD tem de ser igual ao n.º de ficheiros em `cars/` e todos os ids do `index.json` têm de existir.
- **Fixtures**: cópias reduzidas de ficheiros reais (2 a 3 carros de grupos diferentes, 2 atualizações, 1 pista) em `tests/BopRadar.Tests/fixtures/`.

## Docker

- `Dockerfile` multi-stage: `mcr.microsoft.com/dotnet/sdk:9.0` para build/publish e `mcr.microsoft.com/dotnet/aspnet:9.0` para runtime, com utilizador não-root e porta 8080.
- `docker-compose.yml`:
  - `db`: `postgres:17`, volume nomeado, healthcheck com `pg_isready`, credenciais de desenvolvimento num `.env` de exemplo (`.env.example` no repo; o `.env` fica no `.gitignore`);
  - `api`: `depends_on: db (service_healthy)`. Ao arrancar corre `import /data` (o `site/data` montado só de leitura) e depois serve. Tem healthcheck em `/health`.

## CI: `.github/workflows/api.yml`

- **Gatilhos:** `push` e `pull_request` com `paths: [api/**, site/data/**, .github/workflows/api.yml]`. O commit diário de dados do `update.yml` também faz correr esta CI, o que verifica o formato todos os dias.
- **Passos** (ubuntu-latest, que já traz Docker para o Testcontainers):
  1. `actions/setup-dotnet` 9.x;
  2. `dotnet restore`;
  3. `dotnet build -warnaserror`;
  4. `dotnet test`, com unitários, integração e fumo;
  5. `docker build`, sem publicar.
- Badge no README.

## Documentação

Secção "API (.NET)" no `README.md` com:
- diagrama simples (Python → `site/data` → importador → PostgreSQL → API);
- como correr (`docker compose up`);
- link para `/docs`;
- 3 exemplos com curl;
- como correr os testes.

## Riscos

- **O formato JSON muda no Python:** o teste de fumo apanha isto na CI diária, e o erro diz qual é o ficheiro e o campo.
- **Docker Desktop no Windows Home:** precisa de WSL2. Se a instalação falhar, os testes de integração continuam a correr na CI.
- **Tamanho:** cerca de 6,5 MB de JSON, com 123 carros × ~34 versões × 3 sets ≈ 12 mil linhas em `car_bop_entries`. Folgado para o PostgreSQL e para uma transação única.
