
# Supported DB Engines Respective Data Types

Resources provisioned in this application are based upon the tables, views and materialized views -- and the fields and respective data types they contain -- reported on a **`dbSurveyQuery`**.

While this application currently supports three popular database engines -- the **`dbSurveyQuery`** and various Data Type mappings are based upon recent full versions of the engine.

What this means practically is that the application may work on lower versions, the DB data types supported in the application may differ between versions. It's also possible (although not expected) that the **`dbSurveyQuery`** itself would not work for all versions. Anyone noticing an issue is encoraged to open an [issue]() and roll up their sleeves to take the first swing at proposing a resolution.

In time -- its possible that version specific DB Engine support will be provided. But for now the DB Engines supported (including the version used for map development) are outlined below.

## PostgreSQL (Version 12)
- [DB Survey Query](./src/dialects/mysql.ts)
- [Data Types](https://www.postgresql.org/docs/12/datatype.html)
- Map: [DB Data Type -> JOI Validation](./src/dialects/mysql.ts)
- Map: [DB Data Type -> GraphQL Schema](./src/dialects/mysql.ts)
- Map: [DB Data Type -> gRPC Proto Scalar](./src/dialects/mysql.ts)

## MySQL (Version 8)
- [DB Survey Query](./src/dialects/postgres.ts)
- [Data Types](https://dev.mysql.com/doc/refman/8.0/en/data-types.html)
- Map: [DB Data Type -> JOI Validation](./src/dialects/postgres.ts)
- Map: [DB Data Type -> GraphQL Schema](./src/dialects/postgres.ts)
- Map: [DB Data Type -> gRPC Proto Scalar](./src/dialects/postgres.ts)

## SQLite (Version 3)
- [DB Survey Query](./src/dialects/sqlite.ts)
- [Data Types](https://www.sqlite.org/datatype3.html)
- Map: [DB Data Type -> JOI Validation](./src/dialects/sqlite.ts)
- Map: [DB Data Type -> GraphQL Schema](./src/dialects/sqlite.ts)
- Map: [DB Data Type -> gRPC Proto Scalar](./src/dialects/sqlite.ts)

