# 6. Official car images are downloaded at build time and never committed

Date: 2026-10-18 · Status: accepted

## Context
Car pictures make the site much clearer, but they are © Polyphony Digital / Sony Interactive Entertainment.

## Decision
`render --images` downloads them into the git-ignored `cache/car-images/` and converts them to WebP inside `dist/`
only. Building without the flag removes every picture (cars fall back to a neutral silhouette).

## Consequences
- The repository never redistributes the images.
- Dropping one flag from the workflow is the kill switch if the rights holder asks.
