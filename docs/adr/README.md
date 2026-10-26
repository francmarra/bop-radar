# Architecture Decision Records

Short records of the decisions that shaped bop-radar (context → decision → consequences).

1. [Static site fed by a stdlib-only Python pipeline](0001-static-site-stdlib-pipeline.md)
2. [Rank cars by real Daily Race pace, validated by a backtest](0002-rank-by-real-pace.md)
3. [Data checks gate every commit and deploy](0003-data-checks-gate-deploy.md)
4. [.NET API as a read-only mirror of the site data in PostgreSQL](0004-dotnet-api-read-only-mirror.md)
5. [Frontend types generated from the API's OpenAPI document](0005-openapi-generated-client.md)
6. [Official car images are downloaded at build time and never committed](0006-car-images-never-committed.md)
