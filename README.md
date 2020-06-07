# Service-Engine

#### Service-Engine is an ambitious project that aims to provide CRUD + Search functionality to any popular database REST & GraphQL. The service will autodetect DB resources (tables, views, materialized views), provision REST Endpoints & GraphQL Resolvers, provide full validation of each call and auto generate openapi documention that will fully describe all REST resources on the server.

## Quick Start

### install lib and dependencies
```
npm i knex pg service-engine
```

### example app
```
const knex = require('knex');
const ignite = require('service-engine').ignite;

const knexConfig = require('../knexfile');
const metadata = require("./metadata.json");

const knexConfig = {
    client: 'pg',
    connection: 'postgres://postgres:password@localhost:5432/postgres',
}

// consider all these keys required for now
const metadata = {
    appShortName: "some-app-service",
    title: "Some App Service",
    description: "Basic description of core resources.",
    termsOfService: "http://website.io/terms/",
    name: "Joe Wingard",
    email: "open-source@joewingard.com",
    url: "https://github.com/sudowing/service-engine",
    servers: [
        "http://localhost:8080",
        "https://alpha.com",
        "https://bravo.com",
        "https://charlie.com"
    ]
};

const port = 8080;

const db = knex(knexConfig);

const main = async () => {
  await db.migrate.latest();

  const { App, apolloServer, logger } = await ignite({ db, metadata });

  logger.info("🔧 DB Migrations Run");

  App.listen({ port }, () => {
    logger.info({ port 
    }, `🔥 REST Server ready at http://localhost:${port}/openapi`);
    logger.info(`🚀 GraphQL Server ready at http://localhost:${port}${apolloServer.graphqlPath}`);
  });
};

main();
```

## Project Vision

 - Any db supported by knex
 - Validation at the source
 - Auto Generating documentation for REST resources (openapi)
 - CRUD + Search
   - create single/multiple
   - update single/multiple/batch by search
   - soft delete single/multiple/batch by search
   - hard delete single/multiple/batch by search
   - read single/search
 - remove db drivers from apps. use standard http request methods to CRUD records to your dbs via REST + GraphQL
  - Abstraction at DB, enabled easier migration of db in future as limits callers to a single app, enabled automagic handling of parititons via middleware (which the service's callers will not be aware of)
- uuid per service call (reqId injected into each log and attached to each response header)
- verbose error messages in `response.body`
- horitonatlly scalable organization store
  - sibling project provides hub-and-spoke access to multiple implementations, providing single service to port-forward from k8s for easier dev-experience (while deployed apps can call the individual services directly)



## Query Context

Inbound calls for Search Resources (REST & GraphQL) accept a query context that is used to define the sql to be executed. Additionally -- all resources support `fields` context, meaning no matter what operation you are executing, you can limit the fields being returned.

query context options
 - fields
 - orderBy
 - page
 - limit (default set with env var `PAGINATION_LIMIT`)
 - seperator
 - notWhere // The WHERE clause can be combined with AND, OR, and NOT operators.
 - statementContext // The WHERE clause can be combined with AND, OR, and NOT operators.

## Query Makup

Search queries in REST are `get` calls to the `/${schema}_${table}/`.

These calls support multiple query interfaces such as in, not in, like, gte, lt, etc.

A richer description will come in the future -- but review the example below to get an idea of how to call these resources. `query context` options start with a `|`.

### example query

```
const query = {
    zulu: "true",
    field_gt: "field__gt",
    field_gte: "field__gte",
    field_lt: "field__lt",
    field_lte: "field__lte",
    field_not: "field__not",
    field_range: "field__range",
    field_in: "field__in",
    field_not_in: "field__not_in",
    field_like: "field__like",
    field_or: "field__or",
    field_geo_bbox: "field__geo_bbox",
    field_geo_radius: "field__geo_radius",
    field_geo_polygon: "field__geo_polygon",
    field_geo_geojson: "field__geo_geojson",
    "alpha.gt": "field.gt",
    "bravo.gte": "field.gte",
    "charlie.lt": '42',
    "delta.lte": "111",
    "echo.not": "field.not",
    "echo.null": "field.not",
    "echo.not_null": "field.not",
    "foxtrot.range": "5.1,9.7",
    "foxtrot.not_range": "5.1,9.7",
    "golf.in": "braves,marlins,nationals,mets,phillies",
    "hotel.not_in": "braves,marlins,nationals,mets,phillies",
    "alpha.like": "field.like",
    "mike.geo_bbox": "1.1,2.2,3.3,4.4",
    "november.geo_radius": "1.2,2.3,111000",
    "mike.geo_bbox": "one, two, three, four",
    "november.geo_radius": "one, two, three",
    "|seperator": ",",
    "|fields": "alpha,bravo,charlie",
    "|orderBy": "one:desc,charlie:asc,three:desc,four",
    "|delta": "delta",
    "|echo": "echo",
};
```

### example urls
```
# service_call
http://localhost:8080/sample-app-name/service/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t

# debug mode (no db call)
http://localhost:8080/sample-app-name/debug/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t
```

