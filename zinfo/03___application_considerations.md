

# <a id="application-considerations"></a>Application Considerations

The service _should_ work out-of-the-box with minimal configuration. There are however a couple key requirements that must be satisfied before this service will function.

## <a id="application-considerations_unsupported-characters-in-graphql"></a>Unsupported Characters in GraphQL
All schema names, resource names and field names must adhear to GraphQL SDL -- which limits supported characters to a very small subset of ascii chars (`[a-zA-Z0-9]`). It iss possible your db uses unsupported characters and any differences will need to be resolved before you can get this service to run.

Either update the field names or use the permissions to prohibit publication of resources (as setting a permission to `.none()` prohibits the addition of the resource into the GraphQL schema).

## <a id="application-considerations_db-permissions"></a>DB Permissions

Migration support is optional -- however if you want to use it you'll need to ensure the service account being used by the app has appropriate permissions to create objects and write records.

Additionally, if the service account lacks permissions to CRUD to specific objects, the endpoints, resolvers and methods *will* get created -- but calls to the db will result in 500 level errors in `REST` and similar things in `GraphQL` or `gRPC`.
The supported method for resolving this is to define service permissions in the *permissions configuration object*, which will prevent the publication of REST endpoints &* resolvers.

## <a id="application-considerations_returning-fields-on-create-update"></a>Returning Fields on CREATE & UPDATE
This application implements [knex.js](http://knexjs.org), which supports a great many popular DBs, but not all DBs support returning fields on INSERT & UPDATE statements.

Postgres does and it's the recommended engine for new projects implemented this library.

##### **NOTE**: MySQL & Sqlite3 return 201s with no-body  in REST and other payloads in GraphQL & gRPC.

## <a id="application-considerations_supported-db-engines-respective-data-types"></a>Supported DB Engines Respective Data Types

Resources provisioned in this application are based upon the tables, views and materialized views -- and the fields and respective data types they contain -- reported on a **`dbSurveyQuery`**.

While this application currently supports three popular database engines -- the **`dbSurveyQuery`** and various Data Type mappings are based upon recent full versions of the engine.

What this means practically is that the application may work on lower versions, the DB data types supported in the application may differ between versions. It's also possible (although not expected) that the **`dbSurveyQuery`** itself would not work for all versions. Anyone noticing an issue is encoraged to open an [issue]() and roll up their sleeves to take the first swing at proposing a resolution.

In time -- its possible that version specific DB Engine support will be provided. But for now the DB Engines supported (including the version used for map development) are outlined below.

### <a id="application-considerations_postgre-sql-version-12"></a>PostgreSQL (Version 12)
- [DB Survey Query](./src/dialects/mysql.ts)
- [Data Types](https://www.postgresql.org/docs/12/datatype.html)
- Map: [DB Data Type -> JOI Validation](./src/dialects/mysql.ts)
- Map: [DB Data Type -> GraphQL Schema](./src/dialects/mysql.ts)
- Map: [DB Data Type -> gRPC Proto Scalar](./src/dialects/mysql.ts)

### <a id="application-considerations_my-sql-version-8"></a>MySQL (Version 8)
- [DB Survey Query](./src/dialects/postgres.ts)
- [Data Types](https://dev.mysql.com/doc/refman/8.0/en/data-types.html)
- Map: [DB Data Type -> JOI Validation](./src/dialects/postgres.ts)
- Map: [DB Data Type -> GraphQL Schema](./src/dialects/postgres.ts)
- Map: [DB Data Type -> gRPC Proto Scalar](./src/dialects/postgres.ts)

### <a id="application-considerations_sq-lite-version-3"></a>SQLite (Version 3)
- [DB Survey Query](./src/dialects/sqlite.ts)
- [Data Types](https://www.sqlite.org/datatype3.html)
- Map: [DB Data Type -> JOI Validation](./src/dialects/sqlite.ts)
- Map: [DB Data Type -> GraphQL Schema](./src/dialects/sqlite.ts)
- Map: [DB Data Type -> gRPC Proto Scalar](./src/dialects/sqlite.ts)
