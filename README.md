# Service-Engine

Service-Engine is a framework for publishing generalized **`REST`**, **`GraphQL`** & **`gRPC`** Services that facilitate CRUD operations against the tables, views and materialized views of popular databases.

It can be implemented via an [NPM package](https://www.npmjs.com/package/service-engine) **and** as a [Docker Container](https://hub.docker.com/r/sudowing/service-engine).

#  <a id="table-of-contents"></a>Table of Contents

* [Overview](#overview)
    * [REST **and** GraphQL **and** gRPC](#overview_rest-graphql-grpc)
    * [Auto Inspection](#overview_auto-inspection)
    * [Validation at the Source](#overview_validation-at-the-source)
        * [Overview](#overview_validation-at-the-source_overview)
        * [How it works](#overview_validation-at-the-source_how-it-works)
        * [Why this is positive](#overview_validation-at-the-source_why-this-is-positive)
    * [Database Migrations](#overview_database-migrations)
    * [GIS Support](#overview_gis-support)
    * [Enable Future Migration of Database Environments](#overview_enable-future-migration-of-database-environments)
    * [Reduce Dependencies Across Ecosystem](#overview_reduce-dependencies-across-ecosystem)
* [Key Concepts & Interfaces](#key-concepts-interfaces)
    * [SQL - From Afar](#key-concepts-interfaces_sql-from-afar)
    * [Standardized Query = Payload + Context](#key-concepts-interfaces_standardized-query-payload-context)
    * [Standardized Query to SQL](#key-concepts-interfaces_standardized-query-to-sql)
    * [Supported SQL Operators](#key-concepts-interfaces_supported-sql-operators)
    * [Supported Context Keys](#key-concepts-interfaces_supported-context-keys)
    * [Query Metadata](#key-concepts-interfaces_query-metadata)
        * [Request Id](#key-concepts-interfaces_query-metadata_request-id)
        * [SQL](#key-concepts-interfaces_query-metadata_sql)
        * [Search Counts](#key-concepts-interfaces_query-metadata_search-counts)
    * [Debug Mode](#key-concepts-interfaces_debug-mode)
        * [Example URLs](#key-concepts-interfaces_debug-mode_example-urls)
* [Application Considerations](#application-considerations)
    * [Unsupported Characters in GraphQL](#application-considerations_unsupported-characters-in-graphql)
    * [DB Permissions](#application-considerations_db-permissions)
    * [Returning Fields on CREATE & UPDATE](#application-considerations_returning-fields-on-create-update)
    * [Supported DB Engines Respective Data Types](#application-considerations_supported-db-engines-respective-data-types)
        * [PostgreSQL (Version 12)](#application-considerations_postgre-sql-version-12)
        * [MySQL (Version 8)](#application-considerations_my-sql-version-8)
        * [SQLite (Version 3)](#application-considerations_sq-lite-version-3)
* [Application Configurations](#application-configurations)
    * [default page limit](#application-configurations_default-page-limit)
    * [Permissions](#application-configurations_permissions)
    * [Middleware](#application-configurations_middleware)
    * [Examples of Middleware Functionality](#application-configurations_examples-of-middleware-functionality)
    * [Complex Resources (subqueries)](#application-configurations_complex-resources-subqueries)
* [Application Recommendations](#application-recommendations)
    * [Database | PostgreSQL](#application-recommendations_database-postgre-sql)
    * [Change ](#application-recommendations_change-management-db-migrations)
    * [Soft Delete](#application-recommendations_soft-delete)
* [Development Notes](#development-notes)
    * [NPM Link](#development-notes_npm-link)
    * [File Watchers](#development-notes_file-watchers)
    * [Publishing](#development-notes_publishing)
* [Related projects:](#related-projects)
    * [Node Implementation & Public Docker Image ](#related-projects_node-implementation-public-docker-image)
    * [Forkable Service Template ](#related-projects_forkable-service-template)
    * [Local DB Development Guide](#related-projects_local-db-development-guide)
* [Design & Development Walkthroughs](#design-and-development-walkthroughs)
* [Versioning](#versioning)
* [License](#license)


# <a id="quick-start"></a>Quick Start

## <a id="quick-start_prebuilt-docker-container"></a>Prebuilt Docker Container

The fastest way to get up and running with this project, is to fork a [prebuilt docker app](https://github.com/sudowing/service-engine-template)  that implements the framework.

This project runs the public Docker container and contains only migrations and related configurations.



# <a id="overview"></a>Overview

The unique features that make your product(s) stand out in the market deserve the lion's share of your bandwidth. As such, it's unlikely you have much _sincere_ interest in dedicating time building `REST` endpoints that map 1-to-1 to DB tables.

These tasks are tedious and unchallenging -- as the specs for the work are fully derived from DB DDLs -- but if you desire `REST` access... it must be accomplished.

This Framework aims to solve that.

## <a id="overview_rest-graphql-grpc"></a>REST **and** GraphQL **and** gRPC

I've worked in multiple shops where some subset of engineers had an interest in utilizing `GraphQL` or `gRPC`, while others were hesitent as `REST` was the office standard and learning any new tech takes time. A primary goal of this project is to support all three so that the `REST` needs of today are satisfied, while enabling `GraphQL` & `gRPC` evaluation/adoption.

## <a id="overview_auto-inspection"></a>Auto Inspection

The resources provivisioned by the server for the various services (`REST` endpoints, `GraphQL` resolvers & `gRPC` methods) are built based on the results of a query that surveys the DB and returns back a list of all fields within all tables, views or materialized views for all schemas.

## <a id="overview_validation-at-the-source"></a>Validation at the Source

### <a id="overview_validation-at-the-source_overview"></a>Overview
A core benefit of implementing this framework is offloading the **`validation`** a given DB request from other backend processes.

This is benefitial for a few reasons, but before we discuss let's consider how a basic request to a `REST` endpont would get handled.

1. A user calls a `REST` endpoint
2. The **view** processing the request will assembles an object from headers, query string and body.
3. **This object gets validated to ensure it will do no harm and should be executed**
4. The object is transformed to `SQL` and get's sent to the DB for execution.

The example above show some general processing that occurs before a `REST` request gets sent to a DB. The same steps exist in GraphQL and gRPC -- so we'll just focus on **#3** as we discuss the value of this feature.


### <a id="overview_validation-at-the-source_how-it-works"></a>How it works

When an server starts, the following tasks get executed:

1. Run DB Migrations (if configured to do so)
2. Autodetects DB resources  (table, view or materialized view) via inspection
3. Builds [JOI validators](https://joi.dev) for all DB resources (distinct validator for each supported DQL & DML operation)
4. Publishes `REST`, `GraphQL` & `gRPC` services that apply the appropriate validator for different `CRUD` operations

### <a id="overview_validation-at-the-source_why-this-is-positive"></a>Why this is positive


If you've got multiple applications calling the same DB, each application will need implement validation. If you are doing your best to follow the [DRY principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself), one option would be to place the validators inside a dedicated package, then implement that within each app calling the service (this would also be a fine place to share SQL queries).

While this is a fine strategy, the package holding these validators would be a code dependency (across multiple applications), which would require updates with each modification to the database.

Instead, the approach provided here is to simply offload the validation to the server implementing this `service-engine`, which would respond to the caller with either the query results (for valid requests) or a verbose error message (for invalid requests).

## <a id="overview_database-migrations"></a>Database Migrations

Database migrations (a.k.a. [Schema Migrations](https://en.wikipedia.org/wiki/Schema_migration)) are an awesome way for managing changes to db state and since this project will act as the DAL for a specific DB, it makes a logical place to also hold migration files.

If implementing this service by forking the [Dockerized Template project](https://github.com/sudowing/service-engine-template), you will just be building the migration files manually and placing them in the appropriate directory.

If implementing in `node`, you'll be following the [knex migration docs](http://knexjs.org/#Migrations).

## <a id="overview_gis-support"></a>GIS Support

If the DB powering this service is `PostgreSQL` with the `postgis` extension enabled, you will 

This feature works by identifying any fields of a geometric type (as reported in the initial DB survey on startup) and enabling various spacial type functions (`st_*`) via **SEARCH methods**.

Additionally, any fields of this type are published as GeoJSON (after being transformed from WKT).

Current support for spacial search functions include:
- Radius ([ST_Intersects](https://postgis.net/docs/ST_Intersects.html))
- Bounding Box ([ST_Intersects](https://postgis.net/docs/ST_Intersects.html) & [ST_MakeEnvelope](http://www.postgis.net/docs/ST_MakeEnvelope.html))
- Custom Polygon ([ST_Intersects](https://postgis.net/docs/ST_Intersects.html) & [ST_GeomFromText](http://www.postgis.net/docs/ST_GeomFromText.html))

## <a id="overview_enable-future-migration-of-database-environments"></a>Enable Future Migration of Database Environments

By abstracting the DB, you make it easier to manage changes DB versions or introduce optimizations like DB partitioning. This is possible because if applications are calling this service instead of the DB directly, you reduce the number of places where the DB changes need to be introduced.

It may sound absurd to some readers to be 
support fo, 

but if you haven't been a part of a DB to DB migration - you haven't lived. These are complicated projects requiring a fair amount of planning and coordination before finally flipping the switch.

## <a id="overview_reduce-dependencies-across-ecosystem"></a>Reduce Dependencies Across Ecosystem

The need for jdbc/odbc drivers, and the packages that leverage them, will not be needed because this application will be exposeing 
`REST`, `GraphQL` & `gRPC` Services for interacting with the DB.

As a result, native features (like [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)) or lighter dependencies (like [gRPC](https://www.npmjs.com/package/@grpc/grpc-js)) can be used instead.


# <a id="key-concepts-interfaces"></a>Key Concepts & Interfaces

## <a id="key-concepts-interfaces_sql-from-afar"></a>SQL - From Afar

Requests to this server are used to build SQL queries via the SQL Query Builder, [knex.js](http://knexjs.org). While the call signatures for `REST`, `GraphQL` or `gRPC` each differ, each received request gets transformed to a common standard before for validation and execution.

And if you understand how each request gets processed after getting standardized, it should help you understand the various interfaces.

## <a id="key-concepts-interfaces_standardized-query-payload-context"></a>Standardized Query = Payload + Context

Standardized API Requests are comprised of (among other things) a `payload` & `context`. Below is an example of what this standardized object looks like after it's been standardized.

```json
{
	"payload": {
		"occupation": "engineer",
		"state.in": "NJ|PA",
		"handle.like": "sudo%",
	},
	"context": {
		"page": 5,
		"limit": 3,
		"orderBy": "handle,name_last:desc",
		"fields": "id,handle,email,name_first",
		"seperator": "|"
	},
}
```

The **`query`** object above would get validated to ensure all fields requested to be returned and all used for ordering exist on the target resource, the `keys` in the `payload` are fields in the target table, and that the `values` in `payload` are **[A]** of the correct data type and **[B]** the operators used on fields (ex `.like` or `.in`) have the correct number of args and type if the operator has requirements (range, geoquery, etc. have these kinds of requirements).

If **invalid**, the application will respond with a meaningful, verbose message indicating what the issue was with the request.

If **valid**, The **`query`** would get passed to a function that would build `SQL` to be executed against the DB.

## <a id="key-concepts-interfaces_standardized-query-to-sql"></a>Standardized Query to SQL

As an example, the **`query`** object above would produce the `SQL` below:

```sql
select
	  id
	, handle
	, email
	, name_first
from
	public.some_table -- REST call made to /public_some_table
where
	occupation = 'engineer'
	and
	state in ('NJ', 'PA')
	and	
	handle like 'sudo%'
order by
	  handle
	, name_last desc
limit 30
offset 120
```

## <a id="key-concepts-interfaces_supported-sql-operators"></a>Supported SQL Operators

The example above uses three **operators** (`equal`, `in`, `like`), this Framework supports sixteen `operators`. The table below details each supported **operator**, how it's implemented in `REST`, if it will support multiple seperated values and if the operator has a fixed number of arguments.

|field.**`operator`**|sql operator|multiple seperated args|# of args|
|---|:-:|:-:|:-:|
|field|= (default)|false||
|field.`equal`|=|false||
|field.`gt`|>|false||
|field.`gte`|>=|false||
|field.`lt`|<|false||
|field.`lte`|<=|false||
|field.`not`|<>|false||
|field.`like`|like|false||
|field.`null`|is null|false||
|field.`not_null`|is not null|false||
|field.`in`|in (...values)|true||
|field.`not_in`|not in (...values)|true||
|field.`range`|between `x` and `y`|true|2|
|field.`not_range`|not between `x` and `y`|true|2|
|field.`geo_bbox`|geo_bbox|true|4|
|field.`geo_radius`|geo_radius|true|3|
|field.`geo_polygon`|geo_polygon|false||


## <a id="key-concepts-interfaces_supported-context-keys"></a>Supported Context Keys

Inbound calls for Search Resources (REST & GraphQL) accept a query context that is used to define the sql to be executed. Additionally -- all resources support `fields` context, meaning no matter what operation you are executing, you can limit the fields being returned.

Below are all the supported `context` keys available for use within a query:

|key|description|
|---|:-:|
|fields|fields to return from the SQL query|
|seperator|seperator used to seperator values submitted in request (default is `","`|
|orderBy|fields to order results by. can accept multiple values seperated by `","`. Format: `field:desc` (`:asc` is default so you can omit)|
|page|Pagination Page|
|limit|Pagination Limit| (set for service in .env)
|notWhere|The WHERE clause can be combined with AND, OR, and NOT operators. **NOT IMPLEMENTED**|
|statementContext|The WHERE clause can be combined with AND, OR, and NOT operators. **NOT IMPLEMENTED**|

##### <a id-note-context-in-rest-is-always-in-querty-string-this-is"></a>**NOTE:** Context in REST is always in querty string. This is useful for returning fields on `CREATE` & `UPDATE.`

## <a id="key-concepts-interfaces_query-metadata"></a>Query Metadata

There are several standardized components that exist in both `REST` & `GraphQL` interfaces.
`REST` data returns in Response Headers, while `GraphQL` data is returned in response types. `gRPC` currently does not support these features.

### <a id="key-concepts-interfaces_query-metadata_request-id"></a>Request Id

Each request gets a Request ID (uuid) assigned, which is is attached to the response header and also injected into any log statements during the fulfillment of the request. This `reqId` should make searching for events related to a single call in your logs trivial.

|request-header|value|response-header|description|
|---|---|---|---|
|N/A|N/A|`x-request-id`|UUID assigned to request for injection into logs and troubleshooting of calls.|

### <a id="key-concepts-interfaces_query-metadata_sql"></a>SQL

Each call (`REST`, `GraphQL` or `gRPC`) ends up building a SQL query that in most cases get's executed (see [**debug mode**]()). The actual SQL query is always available via a response header on `REST` calls (as `x-sql`) and available another way via GraphQL.

|request-header|value|response-header|description|
|---|---|---|---|
|`x-get-sql`|truthy|`x-sql`|SQL built by service|


### <a id="key-concepts-interfaces_query-metadata_search-counts"></a>Search Counts

Executing a paginated search is a standard operation, and in order to save an additional service call to request the count for a search query (in addition to the actual search providing results) -- the unpaginated count is available via the response header.

This way -- you can choose to request the count for the first page, which does result in 2 DB calls -- but then omit that flag for subsequent pages. `GraphQL` and `gRPC` handles this a bit differently, but they function in very similar manners.

|request-header|value|response-header|description|
|---|---|---|---|
|`x-get-count`|truthy|`x-count`|unpaginated count for submitted query (even if request was paginated)|

## <a id="key-concepts-interfaces_debug-mode"></a>Debug Mode

Every resource can be called in a normal mode, which submits valid queries to the DB and debug mode -- which stops at the DB's door. If you are interested in seeing how a given REST/GraphQL query was parsed, validation responses and the SQL query built (before it's executed) -- you can do so via debug mode in REST & GraphQL.

### <a id="key-concepts-interfaces_debug-mode_example-urls"></a>Example URLs
```
# service_call
http://localhost:8080/sample-app-name/service/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t

# debug mode (no db call)
http://localhost:8080/sample-app-name/debug/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t
```



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



# <a id="application-configurations"></a>Application Configurations

## <a id="application-configurations_default-page-limit"></a>default page limit

BLAH BLAH BLAH

## <a id="application-configurations_permissions"></a>Permissions

Service permissions are managed via permissions objects defined at the system & resource levels:

- `systemPermissions` apply to all db resources published on service (REST & GraphQL).
- `resourcePermissions` can be used to modify/overide permissions set for system.

Below is an example of how to configure permissions for the service:

```js
import { ignite, initPostProcessing, permit } from "service-engine";

const systemPermissions = permit().none();

const resourcePermissions = {
  'public.some_table': permit().create().read().update().delete(),
  'some_schema.some_view_name': permit().read(),
  'some_schema.some_mat_view': permit().read(),
  // sqlite3 has no schemas
  'some_table': permit().create().read().update().delete(),
  'some_view_name': permit().read(),
}

const { App, logger, grpcService } = await ignite({
    db, metadata,
    systemPermissions,
    resourcePermissions,
});
```

## <a id="application-configurations_middleware"></a>Middleware

Sometimes it can be useful to intercept an inbound query before submitting for processing. To accomplish this, this framework supports middleware -- which are a set of functions that take as `input` a **`query object`** and returns a new **`query object`** (that will still pass the validation).

This can be useful for appending submitted queries with additional search criteria deriving from the request **on-the-fly** -- like adding a partition key to a query or by appending a max bbox for a query using a geo point & zoom level.

Below is an example of how to configure permissions for the service:

```js
// object keys are resource endpoints `${schema}_${db_resource}` that are listed in the OpenAPI3 docs at `/openapi`
const resourceSearchMiddleware = {
  public_accounts: item => ({
    ...item,
    partition_key: !!item.email ? item.email.toLowerCase()[0] : null,
  }),
}

const { App, logger, grpcService } = await ignite({
  db,
  metadata,
  resourceSearchMiddleware
});
```

## <a id="application-configurations_examples-of-middleware-functionality"></a>Examples of Middleware Functionality
```sh
# REST call to /public_accounts or
# GRAPHQL query SearchPublicAccounts

# before middleware applied (raw query)
{
  'email': 'clark.kent@dailyplanet.com'
}
# after middleware applied (transformed query)
{
  'email': 'clark.kent@dailyplanet.com',
  'partition_key': 'c'
}
```

## <a id="application-configurations_complex-resources-subqueries"></a>Complex Resources (subqueries)

Subqueries & Aggregate functions in SQL are fully supported in this framework. The configuration of these features are a little clunky, but once setup they support the same common interfaces as all other resources (full validation, middleware support, REST query standards, OpenAPI generation, GraphqL support, etc).

Below is an example of how to configure complex resources for the service:

```js
const complexResources = [
  {
    topResourceName: 'public_i001_city_state_entity_provider_n',
    subResourceName: 'cms_providers',
    groupBy: ['address_city','address_state','entity_type','provider_type'],
    calculatedFields: {
      n: 'count(npi)'
    },
  },
  {
    topResourceName: 'cms_providers',
    subResourceName: 'cms_providers',
    calculatedFields: {
      address_city: 'LOWER(address_city)'
    },
  }
]

const { App, logger, grpcService } = await ignite({
  db,
  metadata,
  complexResources
});
```

##### **NOTE**: I know this is a bit clunky. I'll buy a beer for the person who comes up with something more elegant.


# <a id="application-recommendations"></a>Application Recommendations

## <a id="application-recommendations_database-postgre-sql"></a>Database | PostgreSQL

If you have the option -- I recommend PostgreSQL. Not only does it support [PostGIS](https://postgis.net/), but it's got great support for [table partitioning](https://www.postgresql.org/docs/12/indexes-partial.html) and [partial indexes](https://www.postgresql.org/docs/12/indexes-partial.html).
Additionally, a detail relevant to this project, PostgreSQL supports **returning** on [data manipulation](https://www.postgresql.org/docs/12/dml-returning.html) (CREATE + UPDATE) --  which means you'll get records back, including fields that the db created (like ids) upon creation.

MySQL & SQLite3 do not support this feature, and as a result `REST` Create & Update calls serve 201 no bodys. `GraphQL` and `gRPC` calls function in a similar manner.

## <a id="application-recommendations_change-management-db-migrations"></a>Change Management | DB Migrations

Database migrations (a.k.a. [Schema Migrations](https://en.wikipedia.org/wiki/Schema_migration)) are the best way to manage modifications to the DB state in deployed environments.

In environments above `development`, I would limit the creation of new db objects to the service account to be used by this service -- and I would remove permissions for destructive activies from standard users.

If engineers want to hack or iterate through some ideas, local is the place to do so. Once things get created and owned by the service account, an entire class of problems disappear.

## <a id="application-recommendations_soft-delete"></a>Soft Delete

Removing user data is dangerous.

If you give users features to delete records in bulk -- they'll misuse it. And if you give engineers permission to execute destructive operations in the DB -- they will use them.

For permanently removing user records, I recommend do with via a boolean __active flag__.

Even to support with GDPR or CCPA requirements, I'd not support deleting via this service, but instead, calling this service to flip flags and using an async worker to execute the purge.


# <a id="development-notes"></a>Development Notes

## <a id="development-notes_npm-link"></a>NPM Link

Developing this framework requires using `npm link` to add a local branch of this repo as a dependency for another project that implements it.

One one occasion, and for a reason I did't understand, the implementing project lost track of the local dependency. To resolve that I had to __unlink__ and __relink__ the dependency. If you are ever in a similar situation, the these steps should resolve the issue:

1. Delete the node_modules in both the dependency and the consumer module.
2. Run npm unlink --no-save [dependency-module]
3. re-link with the 2-link commands as per npm-link

Now I am able to fully test my unpublished module locally.

## <a id="development-notes_file-watchers"></a>File Watchers

I use [nodemon](https://www.npmjs.com/package/nodemon) when developing locally to contineally restart the server upon saved changes. On occasion, and for unknown reasons, my system would report this error: 

>Error: ENOSPC: System limit for number of file watchers reached

After a little Sherlocking, I found a solution on [this medium post](https://medium.com/@bestafiko/npm-npm-start-error-enospc-system-limit-for-number-of-file-watchers-reached-bdc0eab0a159). :100: to @bestafiko

```sh
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

## <a id="development-notes_publishing"></a>Publishing

Publishing new versions requires creating a tarball and pushing that NPM. For quick reference, here are the steps.

```sh
npm login # enter username & password
npm pack && npm publish
```


# <a id="related-projects"></a>Related projects:

## <a id="related-projects_node-implementation-public-docker-image"></a>Node Implementation & Public Docker Image 

-##### [GitHub Repo](https://github.com/sudowing/service-engine-docker) 

If you would like to see what a node.js implementation looks like, or are looking for something easily forkable, I've built such an application that serves as the basis for the public Docker Image available on [Docker Hub](https://hub.docker.com/r/sudowing/service-engine).

## <a id="related-projects_forkable-service-template"></a>Forkable Service Template 
-##### [GitHub Repo](https://github.com/sudowing/service-engine-template) 

Instead of having to actually implement this within a node app, you can simply skip that step and run the app as a Docker container, using the  public docker image.

The repo above is a minimalistic project that implements the public Docker Container -- containing only the resources unique to an implementation (metadata, migration files, middleware, complex resources, permissions and env vars).

## <a id="related-projects_local-db-development-guide"></a>Local DB Development Guide
-##### [GitHub Repo](https://github.com/sudowing/guide-local-databases)

Developing this project required working with multiple DBs and learning to standup and load PostGIS.

There are several guides spread around the internet explaining how to run various DBs via containers, so I've simply aggregated the steps and publsihed them here.

Additionally, the process of loading spacial data into PostGIS was completely new to me. I have worked with these types of systems, benefiting greatly from the work of some awesome data folks, but I'd never been required to dive into that myself. **This project changed that.**

In [this repo](https://github.com/sudowing/guide-local-databases#postgis-local-development-guide)
I've included instructions on how to run PostGIS via a container **AND** I've provided the steps needed to load it. From downloading source material (shapefiles), to converting them to `SQL` insert statements and using the `CLI` to import the data -- every step is documented.


# <a id="design-and-development-walkthroughs"></a>Design & Development Walkthroughs

##### [Patreon Link](https://www.patreon.com/sudowing)

This README provides an overview of how to use this framework to (quickly) build `REST`, `GraphQL` and `gRPC` services -- detailing all features and configuration options. 

Anyone intested in exploring how this all works is free to inspect the source.

That being said, there are a great many people who would benefit from a guided overview of this project and a walkthrough of implementing against different DBs.

To support this, I've produced a series of videos
where I provide a detailed walk-through of how this system works, detail each component and explain the requirements and various considerations that went into each  design decision.
 
Any engineers interested in such content, can find it available via subscription via [Patreon](https://www.patreon.com/sudowing).
