# BoP Radar API (.NET) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A read-only ASP.NET Core 9 Web API in `api/` that imports the bop-radar `site/data` JSON into PostgreSQL and serves it, with xUnit unit + integration tests, Docker and a GitHub Actions workflow.

**Architecture:** `BopRadar.Data` holds EF Core entities, the DbContext, migrations, the JSON reader and the importer. `BopRadar.Api` is a Minimal API (one endpoints file per resource, record DTOs, ProblemDetails) that also exposes an `import` command. `BopRadar.Tests` runs unit tests on fixtures and integration tests against a real PostgreSQL via Testcontainers + `WebApplicationFactory`.

**Tech Stack:** .NET 9 (SDK 9.0.300), EF Core 9 + Npgsql.EntityFrameworkCore.PostgreSQL 9, EFCore.NamingConventions 9, Microsoft.AspNetCore.OpenApi 9, Scalar.AspNetCore, xUnit, Microsoft.AspNetCore.Mvc.Testing 9, Testcontainers.PostgreSql, PostgreSQL 17, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-21-dotnet-api-design.md`

## Global Constraints

- Target `net9.0` everywhere; `<Nullable>enable</Nullable>`, `<ImplicitUsings>enable</ImplicitUsings>`, `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` in `api/Directory.Build.props`.
- NuGet packages pinned to the newest **9.0.x** of each Microsoft/Npgsql/EF package (check with `dotnet package search <id> --exact-match`); never a 10.x (needs net10).
- Do **not** modify the Python code, `site/`, `data/`, `src/`, `tests/` (Python) or `.github/workflows/update.yml`.
- DB naming: snake_case (`UseSnakeCaseNamingConvention()`); tables `cars`, `bop_updates`, `car_bop_entries`, `car_update_notes`, `update_changes`, `tracks`.
- Connection string from config key `ConnectionStrings:Default` (env `ConnectionStrings__Default`); no secrets in the repo.
- Route prefix `/api/v1`; all endpoints GET; `/health` and `/docs` outside the prefix.
- `set` ∈ {`h`,`m`,`l`}; `page` ≥ 1 (default 1); `pageSize` 1–100 (default 20); `compare` takes 2–4 distinct ids.
- CORS origins exactly: `https://francmarra.github.io`, `http://localhost:5173` (GET only).
- Container listens on port 8080, runs as non-root.
- "Latest version" always means the version with the greatest **date**, never string order ("1.9" < "1.27").
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `feat/dotnet-api`; never push.

## Review Focus

- Import from an empty or wrong folder (no `cars/*.json`, no `index.json`) must fail **before** touching the DB — mirror semantics would otherwise wipe everything. Test in Task 3.
- `q` search must be case-insensitive and treat `%`/`_` literally (`q=gt-r` finds "GT-R"; `q=%` returns 0). Test in Task 5.
- Version ordering by date, not string: `/updates` and `/cars/{id}/history` order by date; "latest" picks max date. Test in Tasks 5 and 6.
- `compare` with an unknown id → 404 naming that id; with an explicit `version` where one car has no entry → 404; ids are matched exactly (case-sensitive slugs). Test in Task 7.
- An `updates/<v>.json` that references a car id not present in `cars/` → `SiteDataException` naming file and id (not an FK crash mid-transaction). Test in Task 2.

## Prerequisite (Francisco, manual, before Task 1)

- [ ] Install Docker Desktop: `winget install -e --id Docker.DockerDesktop` (needs admin + WSL2; reboot if asked), start it, then `docker run --rm hello-world` prints "Hello from Docker!". Task 1's integration test needs it.

---

### Task 1: Solution, entities, DbContext, initial migration

**Files:**
- Create: `api/BopRadar.sln`, `api/Directory.Build.props`, `api/.gitignore` (bin/, obj/, .env)
- Create: `api/src/BopRadar.Data/BopRadar.Data.csproj`, `Entities.cs`, `BopRadarDbContext.cs`, `Migrations/*` (generated)
- Create: `api/tests/BopRadar.Tests/BopRadar.Tests.csproj`, `PostgresFixture.cs`, `Integration/MigrationTests.cs`

**Interfaces:**
- Produces (namespace `BopRadar.Data`):
  - `class Car { string Id; string Name; string Maker; string Drivetrain; string Group; }`
  - `class BopUpdate { string Version; DateOnly Date; }`
  - `class CarBopEntry { string CarId; string Version; string Set; bool Changed; int Rank; string Tier; double Pp; int PowerPs; double TorqueKgfm; int WeightKg; double PsPerT; string Balance; double Acc100150; double Rotg60; double Rotg120; double Rotg240; double StabLow; double StabHigh; string StabLowFlag; string StabHighFlag; }` — PK (CarId, Version, Set), FKs to cars/bop_updates, check constraint `set IN ('h','m','l')`, index (car_id, set, version).
  - `class CarUpdateNote { string CarId; string Version; int ClassSize; string Summary; JsonDocument Context; }` — PK (CarId, Version); `Context` jsonb.
  - `class UpdateChange { string Version; string CarId; string Verdict; JsonDocument Delta; int Rank; string Summary; JsonDocument Brief; }` — PK (Version, CarId); FKs to bop_updates and cars.
  - `class Track { string Id; string Name; string Set; JsonDocument Stats; }` — `Stats` jsonb.
  - `class BopRadarDbContext(DbContextOptions<BopRadarDbContext>)` with `DbSet`s `Cars, Updates, Entries, Notes, Changes, Tracks`; indexes on `cars.group`, `cars.maker`.
  - `static class DbSetup { static void Configure(DbContextOptionsBuilder b, string connectionString) }` → `UseNpgsql(cs).UseSnakeCaseNamingConvention()` (reused by API, tests and design-time factory).
  - Tests: `PostgresFixture : IAsyncLifetime` (starts `postgres:17` via Testcontainers once per collection, exposes `string ConnectionString` and `BopRadarDbContext NewContext(string database)` which points the same server at that database name — `MigrateAsync` creates it), xUnit collection `"postgres"`.

- [ ] **Step 1:** `dotnet new sln`, `classlib` (Data), `xunit` (Tests) under `api/`, add packages (Npgsql EF provider, NamingConventions, EF Design; Testcontainers.PostgreSql in Tests), project references, `Directory.Build.props` per Global Constraints.
- [ ] **Step 2: Write the failing test** `MigrationTests.Migrate_creates_all_tables`: on a fresh fixture DB, `await db.Database.MigrateAsync()`, then query `information_schema.tables` (schema `public`) and assert it contains exactly-these-at-least: `cars, bop_updates, car_bop_entries, car_update_notes, update_changes, tracks`.
- [ ] **Step 3: Run** `dotnet test api --filter MigrationTests` → FAIL (no migration / no context).
- [ ] **Step 4:** Implement entities + `BopRadarDbContext.OnModelCreating` (keys, FKs, check constraint, jsonb, indexes) + `IDesignTimeDbContextFactory` reading `ConnectionStrings__Default` (fallback `Host=localhost;Database=bopradar;Username=postgres;Password=postgres`); generate `dotnet ef migrations add Initial` (install `dotnet-ef` 9.x as a local tool in `api/.config/dotnet-tools.json`).
- [ ] **Step 5: Run** the test → PASS; `dotnet build api` has 0 warnings.
- [ ] **Step 6: Commit** `feat(api): solution, EF Core model and initial migration`

### Task 2: SiteDataReader (JSON → entities) with fixtures

**Files:**
- Create: `api/src/BopRadar.Data/Import/SiteDataReader.cs`, `Import/SiteData.cs`, `Import/SiteDataException.cs`
- Create: `api/tests/BopRadar.Tests/fixtures/site-data/` (`index.json`, `tracks.json`, `cars/*.json`, `updates/*.json`), `api/tests/BopRadar.Tests/Fixtures.cs`, `Unit/SiteDataReaderTests.cs`

**Interfaces:**
- Consumes: entities from Task 1.
- Produces:
  - `record SiteData(IReadOnlyList<Car> Cars, IReadOnlyList<BopUpdate> Updates, IReadOnlyList<CarBopEntry> Entries, IReadOnlyList<CarUpdateNote> Notes, IReadOnlyList<UpdateChange> Changes, IReadOnlyList<Track> Tracks)`
  - `static class SiteDataReader { static SiteData Read(string siteDataDir) }`
  - `class SiteDataException(string file, string field, string message) : Exception` with `File`, `Field` properties; `Message` contains both.
  - Tests: `static class Fixtures { static string SiteDataDir }` (absolute path to the copied fixtures; mark folder `CopyToOutputDirectory=PreserveNewest`).

**Source mapping** (snake_case JSON): car root → `Car`; each `history[]` item → one `CarUpdateNote` (`v`, `of`→ClassSize, `summary`, `context`) + one `CarBopEntry` per key of `sets` (`v`, `changed`, set fields); `BopUpdate`s = distinct (`v`,`date`) from all histories ∪ `index.json.updates[]` (`version`,`date`); `updates/<v>.json` → `groups.<g>[]` items → `UpdateChange` (`id`→CarId, `verdict`, `delta`, `rank`, `summary`, `brief`); `tracks.json[]` → `Track` (`groups` → Stats). Unmapped JSON fields are ignored.

**Fixtures:** reduced copies of real files: 3 cars from 3 different groups including `963-24` and `155-2-5-v6-ti-93`; 2 `updates/*.json` (the newest real one and one older), each filtered to fixture cars only; `index.json` with only `updates` (entries for the versions present) and `groups` filtered to fixture cars; `tracks.json` with 1 track.

- [ ] **Step 1: Write failing tests** in `SiteDataReaderTests`:
  - `Read_maps_cars_and_entries`: 3 cars; `155-2-5-v6-ti-93` has `Maker == "Alfa Romeo"`, `Group == "gr4"`; entries count == Σ over cars of (history items × sets per item).
  - `Read_builds_updates_from_history_and_index`: every `Entry.Version` exists in `Updates`; versions unique.
  - `Read_keeps_context_as_json`: note for `155-2-5-v6-ti-93` at its last history version has `Context.RootElement.GetProperty("best_set")` of kind String.
  - `Read_throws_for_missing_required_field`: copy fixtures to a temp dir, remove `"maker"` from one car file → `SiteDataException` with `File` ending in that file name and `Field == "maker"`.
  - `Read_throws_for_unknown_car_in_update`: temp copy where an update item has `"id": "no-such-car"` → `SiteDataException` naming the update file and `"id"`.
  - `Read_throws_for_empty_dir`: empty temp dir → `SiteDataException` (field `cars`), and missing `index.json` → `SiteDataException` (field `index.json`).
- [ ] **Step 2: Run** `dotnet test api --filter SiteDataReaderTests` → FAIL.
- [ ] **Step 3:** Implement with `System.Text.Json` (`JsonDocument`/`JsonNode`), one private helper `Required(JsonElement e, string field, string file)` that throws `SiteDataException`. Dates parse as `DateOnly` (`yyyy-MM-dd`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): read bop-radar site data into entities`

### Task 3: SiteDataImporter (mirror in one transaction)

**Files:**
- Create: `api/src/BopRadar.Data/Import/SiteDataImporter.cs`
- Create: `api/tests/BopRadar.Tests/Integration/ImporterTests.cs`

**Interfaces:**
- Consumes: `SiteDataReader.Read`, `BopRadarDbContext`, `PostgresFixture`.
- Produces: `record ImportResult(int Cars, int Updates, int Entries, int Notes, int Changes, int Tracks)`; `class SiteDataImporter(BopRadarDbContext db) { Task<ImportResult> ImportAsync(string siteDataDir, CancellationToken ct = default) }`.

Approach: `MigrateAsync` → `SiteDataReader.Read` (fails before any DB write) → one transaction: `ExecuteDeleteAsync` on all six tables in FK order, `AddRange` everything, `SaveChangesAsync`, commit. Delete-all + insert inside one transaction is the spec's "upsert + delete missing" with identical observable result.

- [ ] **Step 1: Write failing tests** (collection `"postgres"`, each test on its own fresh database name):
  - `Import_twice_gives_same_counts`: two imports of `Fixtures.SiteDataDir` → equal `ImportResult`s and DB row counts equal to the first result.
  - `Import_mirrors_removed_car`: import fixtures; import a temp copy without one car file (and without its update items) → that car id no longer in `cars` nor in `car_bop_entries`.
  - `Import_invalid_json_rolls_back`: import fixtures; import a temp copy with one car file truncated to `{` → throws `SiteDataException`; row counts unchanged.
  - `Import_empty_dir_keeps_data`: import fixtures; import an empty temp dir → throws; `cars` count unchanged.
- [ ] **Step 2: Run** `dotnet test api --filter ImporterTests` → FAIL.
- [ ] **Step 3:** Implement `SiteDataImporter`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): idempotent mirror import in one transaction`

### Task 4: API host — import command, health, errors, OpenAPI, CORS

**Files:**
- Create: `api/src/BopRadar.Api/BopRadar.Api.csproj`, `Program.cs`, `appsettings.json`, `Dtos/Page.cs`, `Validation.cs`
- Create: `api/tests/BopRadar.Tests/ApiFactory.cs`, `Integration/HostTests.cs`

**Interfaces:**
- Consumes: `DbSetup.Configure`, `SiteDataImporter`, `PostgresFixture`.
- Produces:
  - `public partial class Program` (for `WebApplicationFactory<Program>`).
  - CLI: `dotnet BopRadar.Api.dll import <dir>` → runs `SiteDataImporter.ImportAsync`, logs the `ImportResult`, exits 0; on `SiteDataException` logs the message and exits 1; any other args → web host.
  - `record Page<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total)`.
  - `static class Validation { static Dictionary<string,string[]> Paging(int page, int pageSize); static Dictionary<string,string[]> Set(string set); }` — empty dict = valid; endpoints return `TypedResults.ValidationProblem(errors)` when non-empty.
  - `static IResult Validation.NotFound(string what)` → `TypedResults.Problem(statusCode: 404, title: "Not found", detail: what)`.
  - `RouteGroupBuilder api = app.MapGroup("/api/v1")` — later tasks add `api.MapCars()`, `api.MapUpdates()`, `api.MapTracks()`, `api.MapCompare()` (extension methods in `Endpoints/*.cs`).
  - Tests: `ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime` — own Testcontainers PostgreSQL, sets `ConnectionStrings:Default`, imports `Fixtures.SiteDataDir` in `InitializeAsync`; xUnit collection `"api"`.
- [ ] **Step 1: Write failing tests** in `HostTests`:
  - `Health_returns_200_when_db_up` → `GET /health` 200.
  - `Docs_and_openapi_are_served` → `GET /openapi/v1.json` 200 and `GET /docs` 200.
  - `Unknown_route_is_problem_details` → `GET /api/v1/nope` 404 with content type `application/problem+json`.
  - `Cors_allows_pages_origin` → `GET /health` with `Origin: https://francmarra.github.io` returns `Access-Control-Allow-Origin: https://francmarra.github.io`; with `Origin: https://evil.example` no such header.
  - `Import_command_exit_codes` → call the extracted `static Task<int> ImportCommand.RunAsync(string[] args, string connectionString)`: fixtures → 0; empty temp dir → 1.
- [ ] **Step 2: Run** `dotnet test api --filter HostTests` → FAIL.
- [ ] **Step 3:** Implement `Program.cs`: `AddDbContext` via `DbSetup.Configure`, `AddProblemDetails`, `UseExceptionHandler` (generic 500, details only in log), `UseStatusCodePages`, `AddOpenApi` + `MapOpenApi` + `MapScalarApiReference` at `/docs`, CORS policy per Global Constraints, `AddHealthChecks().AddDbContextCheck<BopRadarDbContext>()` → `/health` (503 when unhealthy), `ImportCommand` in `ImportCommand.cs`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): host with import command, health, problem details, openapi, cors`

### Task 5: Cars endpoints

**Files:**
- Create: `api/src/BopRadar.Api/Endpoints/CarsEndpoints.cs`, `Dtos/CarDtos.cs`
- Create: `api/tests/BopRadar.Tests/Integration/CarsEndpointsTests.cs`

**Interfaces:**
- Consumes: `Page<T>`, `Validation` (incl. `Validation.NotFound`), `ApiFactory`.
- Produces (used by Task 7):
  - `record BopStatsDto(int Rank, string Tier, double Pp, int PowerPs, double TorqueKgfm, int WeightKg, double PsPerT, string Balance)`
  - `record CarSummaryDto(string Id, string Name, string Maker, string Group, int? Rank, string? Tier, double? Pp)` — from the car's latest-date `m` entry.
  - `record CarNoteDto(string Version, int ClassSize, string Summary, JsonElement Context)`
  - `record CarDetailDto(string Id, string Name, string Maker, string Drivetrain, string Group, string LatestVersion, IReadOnlyDictionary<string, BopStatsDto> Sets, CarNoteDto? Note)`
  - `record HistoryPointDto(string Version, DateOnly Date, bool Changed, double Pp, int PowerPs, int WeightKg, int Rank, string Tier)`
  - `static RouteGroupBuilder MapCars(this RouteGroupBuilder api)`
- [ ] **Step 1: Write failing tests:**
  - `List_pages_and_counts`: `GET /api/v1/cars?pageSize=2` → `Total == 3`, 2 items, `Page == 1`, `PageSize == 2`.
  - `List_filters_group_and_maker`: `?group=gr4` → only `155-2-5-v6-ti-93`; `?maker=alfa romeo` → same (case-insensitive equality).
  - `List_search_is_case_insensitive_and_literal`: `?q=155` finds it; `?q=V6` finds it; `?q=%` → `Total == 0`.
  - `List_rejects_bad_paging`: `?page=0` and `?pageSize=101` → 400 problem+json with an `errors` key for the bad parameter.
  - `Detail_returns_latest_sets_and_note`: `GET /api/v1/cars/155-2-5-v6-ti-93` → `LatestVersion` equals the max-date version in that car's fixture history; `Sets` keys ⊆ {h,m,l}; `Note.Version == LatestVersion`.
  - `Detail_unknown_is_404`: `/cars/no-such-car` → 404 problem+json.
  - `History_is_ordered_by_date`: `/cars/155-2-5-v6-ti-93/history?set=m` → dates strictly ascending; count == fixture history length.
  - `History_rejects_bad_set`: `?set=x` → 400.
- [ ] **Step 2: Run** `dotnet test api --filter CarsEndpointsTests` → FAIL.
- [ ] **Step 3:** Implement with `AsNoTracking` + `Select` projections; `q` uses `EF.Functions.ILike(c.Name, "%" + escaped + "%", "\\")` where `escaped` escapes `\`, `%`, `_`; `maker` compares with `ILike` without wildcards (escaped); order list by `Group`, then `Rank` (nulls last), then `Name`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): cars list, detail and history endpoints`

### Task 6: Updates and tracks endpoints

**Files:**
- Create: `api/src/BopRadar.Api/Endpoints/UpdatesEndpoints.cs`, `Endpoints/TracksEndpoints.cs`, `Dtos/UpdateDtos.cs`, `Dtos/TrackDtos.cs`
- Create: `api/tests/BopRadar.Tests/Integration/UpdatesTracksEndpointsTests.cs`

**Interfaces:**
- Produces:
  - `record UpdateSummaryDto(string Version, DateOnly Date, IReadOnlyDictionary<string,int> ChangesByGroup)` (group from the joined car; empty dict when the version has no update file)
  - `record UpdateChangeDto(string CarId, string Name, string Group, string Verdict, JsonElement Delta, int Rank, string Summary)`; `record UpdateDetailDto(string Version, DateOnly Date, IReadOnlyList<UpdateChangeDto> Changes)` (changes ordered by Group, Rank)
  - `record TrackSummaryDto(string Id, string Name, string Set)`; `record TrackDetailDto(string Id, string Name, string Set, JsonElement Stats)`
  - `MapUpdates`, `MapTracks` extension methods.
- [ ] **Step 1: Write failing tests:**
  - `Updates_ordered_by_date_desc`: `/api/v1/updates` → dates non-increasing; first item is the newest fixture update version.
  - `Update_detail_lists_changes`: `/updates/{newest fixture version}` → contains `963-24` with non-empty `Verdict`.
  - `Update_unknown_is_404`: `/updates/0.0` → 404.
  - `Tracks_list_and_detail`: `/tracks` → 1 item; `/tracks/{id}` → `Stats` is a JSON object; `/tracks/nope` → 404.
- [ ] **Step 2: Run** `dotnet test api --filter UpdatesTracksEndpointsTests` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): updates and tracks endpoints`

### Task 7: Compare endpoint

**Files:**
- Create: `api/src/BopRadar.Api/Endpoints/CompareEndpoints.cs`, `Dtos/CompareDtos.cs`
- Create: `api/tests/BopRadar.Tests/Unit/CompareRulesTests.cs`, `Integration/CompareEndpointsTests.cs`

**Interfaces:**
- Consumes: `BopStatsDto` (Task 5), `Validation` (incl. `Validation.NotFound`).
- Produces:
  - `record CompareCarDto(string Id, string Name, string Maker, string Group, BopStatsDto Stats)`; `record CompareDto(string Version, string Set, IReadOnlyList<CompareCarDto> Cars)` (cars in request order).
  - `static class CompareRules { static Dictionary<string,string[]> ValidateIds(string? ids, out string[] parsed); static string? LatestCommonVersion(IEnumerable<(string CarId, string Version, DateOnly Date)> rows, IReadOnlyCollection<string> carIds); }` — ids split on `,`, trimmed, empty parts dropped.
- [ ] **Step 1: Write failing unit tests** (`CompareRulesTests`): `ValidateIds` errors for `null`, `"a"`, `"a,b,c,d,e"`, `"a,a"`; no errors for `"a, b"` (parsed `["a","b"]`). `LatestCommonVersion` returns the max-date version present for all ids (ignoring a later version only one car has) and `null` when none is shared.
- [ ] **Step 2: Write failing integration tests** (`CompareEndpointsTests`): two fixture cars → 200, `Cars.Count == 2` in request order, `Set == "m"`; `ids=155-2-5-v6-ti-93,no-such-car` → 404 with `detail` containing `no-such-car`; explicit `version` where one car has no entry → 404; `ids=155-2-5-v6-ti-93` → 400; `set=x` → 400. (No shared version → 404 is covered by the `LatestCommonVersion` unit test; the endpoint maps `null` to `Validation.NotFound`.)
- [ ] **Step 3: Run** `dotnet test api --filter Compare` → FAIL.
- [ ] **Step 4:** Implement.
- [ ] **Step 5: Run** → PASS.
- [ ] **Step 6: Commit** `feat(api): compare endpoint`

### Task 8: Smoke test with the real site/data

**Files:**
- Create: `api/tests/BopRadar.Tests/Integration/RealDataSmokeTests.cs`

**Interfaces:**
- Consumes: `SiteDataImporter`, `PostgresFixture`. Locates the repo's `site/data` by walking up from `AppContext.BaseDirectory` until `site/data/index.json` exists.
- [ ] **Step 1: Write the test** `Real_site_data_imports`: import → `ImportResult.Cars` == number of files in `site/data/cars/*.json`; every car id in `index.json.groups[].cars[].id` exists in `cars`; `Entries > 0`, `Changes > 0`, `Tracks` == length of `tracks.json`.
- [ ] **Step 2: Run** `dotnet test api --filter RealDataSmokeTests` → PASS (if it FAILS, the message names file + field; fix the reader, not the data, and add a fixture-based unit test for that case in `SiteDataReaderTests`).
- [ ] **Step 3: Commit** `test(api): smoke import of the real site data`

### Task 9: Docker image and compose

**Files:**
- Create: `api/Dockerfile`, `api/.dockerignore`, `api/docker-compose.yml`, `api/.env.example`

**Interfaces:**
- Compose services: `db` (`postgres:17`, named volume `pgdata`, healthcheck `pg_isready -U $POSTGRES_USER`, env from `.env`), `api` (build `.`, `depends_on: db: condition: service_healthy`, env `ConnectionStrings__Default=Host=db;Database=${POSTGRES_DB};Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}`, volume `../site/data:/data:ro`, port `8080:8080`, command runs `import /data` then the web host, healthcheck `GET /health`).
- `.env.example`: `POSTGRES_DB=bopradar`, `POSTGRES_USER=bopradar`, `POSTGRES_PASSWORD=change-me`.
- [ ] **Step 1:** Write the Dockerfile (multi-stage `sdk:9.0` → `aspnet:9.0`, `USER app`, `ASPNETCORE_HTTP_PORTS=8080`) and compose. Entry point: a shell `sh -c "dotnet BopRadar.Api.dll import /data && exec dotnet BopRadar.Api.dll"`.
- [ ] **Step 2: Verify:** in `api/`, `cp .env.example .env && docker compose up -d --build`, wait for healthy, then `curl -s localhost:8080/health` → `Healthy`; `curl -s "localhost:8080/api/v1/cars?pageSize=1"` → JSON with `"total"` ≥ 120; `docker compose logs api` shows the import counts. Then `docker compose down -v`.
- [ ] **Step 3: Commit** `build(api): dockerfile and compose (api + postgres)`

### Task 10: CI workflow and README

**Files:**
- Create: `.github/workflows/api.yml`
- Modify: `README.md` (append section "API (.NET)"; keep everything else)

- [ ] **Step 1:** `api.yml`: name `api`; triggers `push` + `pull_request` with `paths: ['api/**', 'site/data/**', '.github/workflows/api.yml']`; job on `ubuntu-latest`: checkout, `actions/setup-dotnet@v4` with `dotnet-version: 9.0.x`, `dotnet restore api`, `dotnet build api --no-restore -warnaserror`, `dotnet test api --no-build`, `docker build api`.
- [ ] **Step 2:** README section: CI badge (`https://github.com/francmarra/bop-radar/actions/workflows/api.yml/badge.svg`), one-line diagram `Python pipeline → site/data/*.json → importer → PostgreSQL → ASP.NET Core API`, run (`cd api && cp .env.example .env && docker compose up`), docs at `http://localhost:8080/docs`, 3 curl examples (cars list with `group=gr3`, car history, compare two ids), tests (`dotnet test api`, needs Docker).
- [ ] **Step 3: Verify:** `dotnet test api` all green locally; workflow YAML valid (`gh workflow view` not possible before push — check by reading; Francisco pushes later).
- [ ] **Step 4: Commit** `ci(api): build, test and docker build workflow + README section`
