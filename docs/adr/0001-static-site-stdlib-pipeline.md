# 1. Static site fed by a stdlib-only Python pipeline

Date: 2026-10-16 · Status: accepted

## Context
The site has a few hundred visitors at most, data changes at most once a day, and it must cost nothing to run.

## Decision
A Python ≥3.12 pipeline using only the standard library (`fetch → parse → build → assess → write JSON`) writes
`site/data/*.json`; the site is a static vanilla-JS SPA plus pre-rendered pages, hosted on GitHub Pages and rebuilt
by a scheduled GitHub Action.

## Consequences
- Zero hosting cost, nothing to patch, no runtime to keep alive; the whole history is in git.
- No dependencies to audit in the pipeline; the price is hand-written HTML parsing, so parsers reject partially
  broken pages instead of guessing.
- No server-side features (search, comparisons across versions) — those moved to the optional API (ADR 4).
