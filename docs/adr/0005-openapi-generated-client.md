# 5. Frontend types generated from the API's OpenAPI document

Date: 2026-10-22 · Status: accepted

## Context
The React comparator (`web/`) and the .NET API live in the same repo and evolve together; hand-written types drift.

## Decision
`npm run gen:api` generates TypeScript types from the running API's OpenAPI document; the typed client and
TanStack Query hooks use only those types. CI regenerates them and fails if the committed file differs.

## Consequences
- Breaking API changes fail the frontend build instead of failing at runtime.
- Components are tested with React Testing Library against MSW-mocked HTTP through the real client.
