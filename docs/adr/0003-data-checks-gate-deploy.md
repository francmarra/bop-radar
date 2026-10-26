# 3. Data checks gate every commit and deploy

Date: 2026-10-18 · Status: accepted

## Context
The pipeline scrapes third-party pages that can change shape at any time. A silent parser break would publish
empty or wrong rankings.

## Decision
`gt7bop check --baseline <previous data> --max-age 2` runs in the Action before anything is committed. Errors
(broken, missing, shrinking or regressing data) stop the run; warnings deploy but open an `action-alert` issue,
which the next healthy run closes.

## Consequences
- The live site always keeps its last good data.
- Failures reach me as GitHub issues instead of being noticed by users.
