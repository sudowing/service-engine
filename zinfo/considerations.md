

# Important Considerations

The service _should_ work out-of-the-box with minimal configuration. There are however a couple key requirements that must be satisfied before this service will function.

## Unsupported Characters in GraphQL
All schema names, resource names and field names must adhear to GraphQL SDL -- which limits supported characters to a very small subset of ascii chars (`[a-zA-Z0-9]`). It iss possible your db uses unsupported characters and any differences will need to be resolved before you can get this service to run.

Either update the field names or use the permissions to prohibit publication of resources (as setting a permission to `.none()` prohibits the addition of the resource into the GraphQL schema).

## DB Permissions

Migration support is optional -- however if you want to use it you'll need to ensure the service account being used by the app has appropriate permissions to create objects and write records.

Additionally -- if the service account lacks permissions to CRUD to specific objects, the endpoints, resolvers and methods *will* get created -- but calls to the db will result in 500 level errors in `REST` and similar things in `GraphQL` or `gRPC`.
The supported method for resolving this is to define service permissions in the *permissions configuration object*, which will prevent the publication of REST endpoints &* resolvers.

## Returning Fields on CREATE & UPDATE
This application implements [knex.js](http://knexjs.org/), which supports a great many popular DBs, but not all DBs support returning fields on INSERT & UPDATE statements.

Postgres does and it's the recommended engine for new projects implemented this library.

###### **NOTE**: MySQL & Sqlite3 return 201s with no-body  in REST and other payloads in GraphQL & gRPC.




## Supported DB Engines Respective Data Types

Resources provisioned in this application are based upon the tables, views and materialized views -- and the fields and respective data types they contain -- reported on a **`dbSurveyQuery`**.

(`REST` endpoints, `GraphQL` resolvers & `gRPC` methods)

## Supported DB Engines

Schema

### PostgreSQL (Version 12)
- [Data Types](https://www.postgresql.org/docs/12/datatype.html)
- [DB Survey Query](./src/dialects/mysql.ts)
- Map: [Data Type -> JOI Validation](./src/dialects/mysql.ts)
- Map: [Data Type -> GraphQL Schema](./src/dialects/mysql.ts)
- Map: [Data Type -> gRPC Proto Scalar](./src/dialects/mysql.ts)

### MySQL (Version 8)
- [Data Types](https://dev.mysql.com/doc/refman/8.0/en/data-types.html)
- [DB Survey Query](./src/dialects/postgres.ts)
- Map: [Data Type -> JOI Validation](./src/dialects/postgres.ts)
- Map: [Data Type -> GraphQL Schema](./src/dialects/postgres.ts)
- Map: [Data Type -> gRPC Proto Scalar](./src/dialects/postgres.ts)

### SQLite (Version 3)
- [Data Types](https://www.sqlite.org/datatype3.html)
- [DB Survey Query](./src/dialects/sqlite.ts)
- Map: [Data Type -> JOI Validation](./src/dialects/sqlite.ts)
- Map: [Data Type -> GraphQL Schema](./src/dialects/sqlite.ts)
- Map: [Data Type -> gRPC Proto Scalar](./src/dialects/sqlite.ts)




asd 
- typed from current versions
 for the most recent versions of the supported databases
