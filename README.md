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

##### **NOTE:** Context in REST is always in query string. Even if doing a POST, PUT, PATCH, DELETE -- the context will come from there.

## Query Makup

Search queries in REST are `get` calls to the `/${schema}_${table}/`.

These calls support multiple query interfaces such as in, not in, like, gte, lt, etc.

A richer description will come in the future -- but review the example below to get an idea of how to call these resources. `query context` options start with a `|`.

### example query

```js
const query = {
    "alpha.gt": "199",
    "bravo.gte": "200",
    "charlie.lt": '1000',
    "delta.lte": "999",
    "echo.not": "some_value",
    "echo.null": "truthy",
    "echo.not_null": "truthy",
    "foxtrot.range": "5.1,9.7",
    "foxtrot.not_range": "5.1,9.7",
    "golf.in": "braves,marlins,nationals,mets,phillies",
    "hotel.not_in": "braves,marlins,nationals,mets,phillies",
    "alpha.like": "philadel",
    "mike.geo_bbox": "1.1,2.2,3.3,4.4",
    "november.geo_radius": "1.2,2.3,111000",
    "mike.geo_bbox": "one, two, three, four",
    "november.geo_radius": "one, two, three",
    "|seperator": ",",
    "|fields": "alpha,bravo,charlie",
    "|orderBy": "one:desc,charlie:asc,three:desc,four",
    "|page": "3",
    "|limit": "50",
    "|limit": "50",

    // not implemented
    // "|notWhere": "undefined",
    // "|statementContext": "and",
};
```

### example urls
```
# service_call
http://localhost:8080/sample-app-name/service/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t

# debug mode (no db call)
http://localhost:8080/sample-app-name/debug/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t
```

### resource search middleware
Middleware can be defined that is applied to any search resources. This middleware takes as `input` an object comprised of qs args and returns a new object (that will still pass the validation). This can be useful for deriving additional search criteria from submitted queries. Think adding a partition key to a query by taking the first `n` chars from a handle -- or by appending a max bbox for a query using a point.

example:
```js
// object keys are resource endpoints `${schema}_${table/view/materialized-view}`
const resourceSearchMiddleware = {
  public_accounts: item => ({...item, email: 'clark.kent@dailyplanet.com'}),
}

// ...

const { App, apolloServer, logger } = await ignite({ db, metadata, resourceSearchMiddleware });
```


### complexResources (subqueries & aggregation)
blah blah blah

example:
```js
const complexResources = [
  {
    topResourceName: 'public_i001_city_state_entity_provider_n',
    subResourceName: 'cms_providers',
    group_by: ['address_city','address_state','entity_type','provider_type'],
    calculated_fields: {
      n: 'count(npi)'
    },
  },
  {
    topResourceName: 'cms_providers',
    subResourceName: 'cms_providers',
    calculated_fields: {
      address_city: 'LOWER(address_city)'
    },
  }
]


// ...

const { App, logger } = await ignite({
  db,
  metadata,
  resourceSearchMiddleware,
  complexResources
});


```










https://medium.com/the-andela-way/scaling-out-with-node-clusters-1dca4a39a2a


npm bundleDependencies


```
2

What worked for me was to:

    Delete the node_modules in both the dependency and the consumer module.
    Run npm unlink --no-save [dependency-module]
    re-link with the 2-link commands as per npm-link

Now I am able to fully test my unpublished module locally.

Additionally, there is an npm pack command which can help you test your unpublished modules, although not quite as robust.
```






$ npm install knex --save

# Then add one of the following (adding a --save) flag:
$ npm install pg
$ npm install sqlite3
$ npm install mysql
$ npm install mysql2
$ npm install oracledb
$ npm install mssql

-----

design concept

koa view --> STANDARDIZED QUERY & CONTEXT <-- GraphQL Resolver
Validation & Knex Query Building
Knex Execution

Survey the db to get info on DB resources
Use this to auto generate validators & Resource Objects,
Create REST endpoints and Resolvers for each resource

Fully validated
DB engine specifics abstracted away via knex
ST queries supported via knex-postgis

openapi docs derived from survey

-----

also note that postgre WKT will be converted to geojson automatically while mysql will just stay as it's json representation








logger log.msg
  service_call
      general call

  CRUD CALLS TO CLASS
  context_errors
  validation_error
  resource_response
  resource_call

  in router (and needs to be in graphql)
  db_call_failed

  startup_failed