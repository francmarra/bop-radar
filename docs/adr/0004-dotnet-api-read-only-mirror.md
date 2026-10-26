# 4. .NET API as a read-only mirror of the site data in PostgreSQL

Date: 2026-10-21 · Status: accepted

## Context
The static JSON is shaped for the site's pages. Queries such as "compare these 4 cars" or paged search need a real
query layer, without changing the Python pipeline that already works.

## Decision
An ASP.NET Core 9 Minimal API (`api/`) with EF Core + PostgreSQL. An `import` command mirrors `site/data` into the
database in one transaction; endpoints are GET-only under `/api/v1` with OpenAPI docs and ProblemDetails errors.
Integration tests run against a real PostgreSQL through Testcontainers, not an in-memory fake.

## Consequences
- The Python side stays the single source of truth; the API can be dropped and rebuilt at any time.
- Import reads and validates all files **before** touching the database: an empty or wrong folder must not wipe
  the mirror (tested).
- Tests need Docker, in exchange for catching real SQL and migration bugs (e.g. case-insensitive search treating
  `%`/`_` literally).
