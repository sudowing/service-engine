# Service-Engine

Service-Engine is an opinionated framework 
for publishing **REST** Endpoints & **GraphQL** Resolvers for database resources (tables, views and materialized views).
The goal is to provide a generalized method for quickly standing up a data access layer, providing **CRUD** functionality to commonly used SQL databases -- with a few bells and whistles thrown in.

[![Alt text](https://i3.ytimg.com/vi/ZeFpweKpIHo/maxresdefault.jpg)](https://www.youtube.com/watch?v=ZeFpweKpIHo)

On start,
- run migrations (if configured to do so)
- autodetect db resources (via inspection)
- builds validators for CREATE, READ, UPDATE, DELETE & SEARCH methods
- publishes REST endpoints & GraphQL resolvers 
- autogenerate OpenAPI3 documentation



#  <a id="table-of-contents"></a>Table of Contents

* [Quick Start](#quick-start)
* [Start with Prisma for GraphQL API](#start-with-prisma)
* [Source data](#db-data-source)
* [Schema](#db-schema)
  * [Source Data Tables](#db-schema-tables-source)
  * [Analytic Data Tables](#db-schema-tables-analytic)
* [Geocoding Addresses](#geocoding)
* [Prisma IDs](#prisma-requirements)
* [GraphQL Queries](#graphql-queries)
  * [HCPCS Service Performance & Leaders](#graphql-hcpcs-service-performance-and-leaders)
  * [Provider Identiy & Service Performance](#graphql-provider-id-and-service-performance)
* [Development](#development)
  * [Run Service](#dev-run-Service)
  * [Container Maintenance](#dev-container-maintenance)
  * [Generate DB Export](#dev-generate-db-export)
  * [Restore DB from Export](#dev-restore-db-from-export)
  * [Build & Load DB via ETL Process](#dev-full-etl-process)
  * [Container Entry Shortcut](#dev-container-entry-shortcut)
* [Project Origin & Inspiration](#project-origin)
* [Additional Data Sets](#additional-data-sets)
* [Versioning](#versioning)
* [License](#license)




# Benefits

## What's the value here?

### REST **_and_** GraphQL.

I've worked in multiple shops where some subset of engineers had an interest in utilizing GraphQL -- but others were hesitent as REST was the office standard and learning any new tech takes time. A primary goal of this project is to support both so that the REST needs of today are satisfied, while enabling GraphQL evaluation/adoption.

### Validation at the Source

JOI validators are created for each resource -- or more acurately each CRUD method for each resource.

These validators prevent invalid db queries from reaching the database and also offloading validation requirements from clients.

### Database Migrations

Migrations are an awesome way for managing changes to db state. Since this project will act as the DAL for a specific DB, it makes a logical place to also hold migration files.


### Most CRUD is Generic

Do you really _want_ to build individual REST endpoints? Why reinvent the wheel if this provides what you need?

### Prebuilt Docker Container

use the prebuilt docker app that implements the framework. don't even need to implement it in node yourself.

Docker container & clonable template for migrations, configs and specifics

### facilitate future migration of backing services
Abstraction at DB, enabled easier migration of db in future as limits callers to a single app, enabled automagic handling of parititons via middleware (which the service's callers will not be aware of)

If you haven't been a part of a db to db migration - you haven't lived. These are complicated projects requiring a fair amount of planning and coordination before finally flipping the switch.

## horitonatlly scalable data stores

horitonatlly scalable data stores
sibling project provides hub-and-spoke access to multiple implementations, providing single service to port-forward from k8s for easier dev-experience (while deployed apps can call the individual services directly)


## geoqueries serving GeoJSON

Self host GIS systems













# Interface Components (Query Metadata)

There are several standardized components that exist in both REST & GraphQL interfaces.
REST data returns in Response Headers, while GraphQL data is returned in response types.


## Request Id

Each request get's a Request ID (uuid) assign, which get's attached to the response header and also injected into any log statements during the fulfillment of the request. This reqId should make searching for events related to a single call in your logs trivial.

## SQL

Each call (REST & GraphQL) ends up building a SQL query that in most cases get's executed. The actual SQL query is always available via a response header on REST calls (and available another way via GraphQL -- more to follow).


## Search Counts

Executing a paginated search is a standard operation, and in order to save an additional service call to request the count for a search query (in addition to the actual search providing results) -- the unpaginated count is available via the response header.

This way -- you can choose to request the count for the first page, which does result in 2 DB calls -- but then omit that flag for subsequent pages. GraphQL handles this a bit differently as there is a specific resolver for counts.




------


# SQL -- from afar

Both REST calls and GraphQL calls end up building SQL queries. Some components of the 
service request are related to 

return fields, pagination, ordering, and a few other things -- these are defined a `context`

the comparison, logical and spacial type operators that are all supported are defined as the request `query`

a single REST call will have a `query` + `context` regardless of what CRUD method is being triggered.

The same concepts are used in the GraphQL calls -- although the format is slightly different as the inputs can be submitted as their json type instead of strings via query string.




## db inspection
Any supported by Knex -- 3 currently implemented (more to come)


## supported databases
Any supported by Knex -- 3 currently implemented (more to come)


## Project Vision
 - CRUD + Search
   - create single/multiple
   - update single/multiple/batch by search
   - soft delete single/multiple/batch by search
   - hard delete single/multiple/batch by search
   - read single/search

- verbose error messages in `response.body`


SQL via REST & GraphQL

Query & Context

```
select
	fclass, name, geom
from
	public.gis_osm_places_free_1
where
	fclass in ('hamlet', 'village')
	and
	name like 'Ro%'
order by
	name desc
limit 250
```




Query = Supported SQL Operators
 - equal
 - gt
 - gte
 - lt
 - lte
 - not
 - like
 - null
 - not_null
 - in
 - not_in
 - range
 - not_range
 - geo_bbox
 - geo_radius
 - geo_polygon

Context = additional information to be used in - query
- fields
- seperator
- notWhere // The WHERE clause can be combined with AND, OR, and NOT operators.
- statementContext // The WHERE clause can be combined with AND, OR, and NOT operators.
- orderBy
- page
- limit (set for service in .env)


## geoqueries
  geoqueries are support in postgis where fields are geo types

  also note that postgre WKT will be converted to geojson automatically while mysql will just stay as it's json representation





## validation -- based on db models
validate search interfaces, fields requested, etc

## Query Context

Inbound calls for Search Resources (REST & GraphQL) accept a query context that is used to define the sql to be executed. Additionally -- all resources support `fields` context, meaning no matter what operation you are executing, you can limit the fields being returned.

##### **NOTE:** Context in REST is always in 
## Query Makup
### example query
### example urls















--- 
## what about joins
Joins are supported in views.

## how about subqueries
Supported -- al beit a little clunky. I'll buy a beer for the person who comes up with something more elegant.

see: complex queries
## Explain automagic partition handling!

There exists a middleware method that allows you to intercept & manipulate inbound service queries **before** they get submitted for processing (validation & db query). Think hard coding some search param, appending a search param based on the query or other related things.

see: middleware




---



sdasdf

## Debug Mode

Every resource can be called in a normal mode, which submits valid queries to the DB and debug mode -- which stops at the DB's door. If you are interested in seeing how a given REST/GraphQL query was parsed, validation responses and the SQL query built (before it's executed) -- you can do so via debug mode in REST & GraphQL.





















# Optional Configurations

## Permissions

Permissions for db resources are managed via permissions objects defined at the system & resource levels:

- `systemPermissions` apply to all db resources published on service (REST & GraphQL).
- `resourcePermissions` can be used to modify/overide permissions set for system.

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

const { App, logger } = await ignite({
    db, metadata,
    systemPermissions,
    resourcePermissions,
});
```










## Middleware

Sometimes it can be useful to intercept an inbound query before submitting for processing. In order to support this, this framework supports a concept of middleware, which are a set of functions that take as `input` an object comprised of qs args (or GraphQL input) and returns a new object (that will still pass the validation).

This can be useful for appending submitted queries with additional search criteria deriving from the request on-the-fly -- like adding a partition key to a query or by appending a max bbox for a query using a geo point & zoom level.

example:
```js
// object keys are resource endpoints `${schema}_${db_resource}` that are listed in the OpenAPI3 docs at `/openapi`
const resourceSearchMiddleware = {
  public_accounts: item => ({
    ...item,
    partition_key: !!item.email ? item.email.toLowerCase()[0] : '',
  }),
}

const { App, apolloServer, logger } = await ignite({
  db,
  metadata,
  resourceSearchMiddleware
});
```

### Examples of Middleware Functionality
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



















## Complex Resources (subqueries)

Subqueries & Aggregate functions in SQL are fully supported in this framework. The configuration of these features are a little clunky, but once setup they support the same common interfaces as all other resources (full validation, middleware support, REST query standards, OpenAPI generation, GraphqL support, etc).



. I'll buy a beer for the person who comes up with something more elegant.

example:
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

const { App, logger } = await ignite({
  db,
  metadata,
  complexResources
});


```


---



















### default page limit

# service_call
# debug mode (no db call)




# Foundational dependencies

- knex: blah blah blah
- @sideways/joi: blah blah blah
- apollo: blah blah blah
- shin docs & mershin



### existing dbs:
- service account that can execute inspection queries
- supported dbs














# Project Quality

## code coverage

Needs some work -- I know.

project is configured to produce NYC/Istanbul coverage reports.

## js docs

When time permitted -- I added js docs throughout. I'm pretty new to using them, so it's likely I missed something you may consider obvious.

As they say in NYC -- if you see something, patch something



















# Recommendations

## Database

If you have the option -- I'd select postgres. Not only does it support postgis, but it's got great support for partitions and partial indexes. Additionally -- a detail relevant to this project -- it supports `returning` on CREATE + UPDATE (unlike mysql & sqlite). That means you'll get records back, including fields that the db created (like ids) upon creation. MySQL & SQLite3 serve 201 no bodys.

## migrations from the jump

in deployed environments I would limit the creation of new db objects to the service account to be used by this service -- and I would remove permissions for destructive activies (and probably creative ones) from standard users.

If engineers want to hack or iterate through some ideas, local is the place to do so. Once things get created and owned by the service account, an entire class of problems disappear.

## soft delete

###### **not yet implemented**
removing user data is bad. I'd prefer do with via an active flag. Even to support with GDPR or CCPA requirements, I'd not support deleting via this service. instead -- this service should flip flags and an async worker should connect to the to this service via a special method to handle the user requested (and gov mandated) purge















# Related projects:
## Public Docker Image 
Source for [public dockerfile](https://github.com/sudowing/service-engine-docker) that implements this node lib
## Forkable Service Template 
[Clonable project](https://github.com/sudowing/service-engine-template) that implements the public docker image, containing only the resources unique to an implementation (metadata, migration files, middleware, complex resources, permissions and env vars)
## Demo Project 
demo project, complete with insomnia export that shows multiple CRUD calls via REST & GraphQL against all currenly supported DBs (postgres, mysql and sqlite3)
## Local DB Guide 
[Local DB Guide](https://github.com/sudowing/guide-local-databases), which shows you how to quickly setup and load demo postgres, postgis and mysql databases -- used for the demo project and your exploration of this framework.
Much of that guide is built on prior-art, but it aggregates step-by-step instructions required for the running (and populating) of various db engines, mostly within docker containers with persistant data.






# Important Considerations
The service _should_ work out-of-the-box with minimal configuration. There are however a couple key requirements that must be satisfied before this service will function.

## Unsupported Characters in GraphQL
All schema names, resource names and field names must adhear to GraphQL SDL -- which limits supported characters to a very small subset of ascii chars (`[a-zA-Z0-9]`). It iss possible your db uses unsupported characters and any differences will need to be resolved before you can get this service to run.

Either update the field names or use the permissions to prohibit publication of resources (as setting a permission to `.none()` prohibits the addition of the resource into the GraphQL schema).

## DB Permissions
Migration support is optional -- however if you want to use it you'll need to ensure the service account being used by the app has appropriate permissions to create objects and write records.

Additionally -- if the service account lacks permissions to CRUD to specific objects, the endpoints & resolvers *will* get created -- but calls to the db will result in 500 level errors.
The supported method for resolving this is to define service permissions in the *permissions configuration object*, which will prevent the publication of REST endpoints &* resolvers.

## Returning Fields with CREATE & UPDATE
While this service implements [knex.js](http://knexjs.org/), which supports a great many popular DBs, not all DBs support returning fields on INSERT & UPDATE queries. Postgres does and it's the recommended engine for new projects implementing this library.

###### **NOTE**: MySQL & Sqlite3 return 201s with no-body responses.












# Design & Development Walkthroughs

This documention provides an overview of how to use this service, detailing all features and configuration options. Anyone intested in exploring how this all works is free to inspect the source.

That being said, there are a great many people who would benefit from a guided overview of this project.

To support this, I've produced a series of videos
where I provide a detailed overview as to how this system works, detail each component and explain the requirements and various considerations that went into each and discuss the various decision made throughout the development.
 
Any engineers interested in such content, can find it available via subscription via [Patreon](https://www.patreon.com/sudowing).


example calls
  REST
  GRAPHQL
  GRPC

future development (issues)

CONFIGS
  db host
  pagination
  use migrations
  etc
  metadata -> for openapi and service route and logs (think datadog)


supported databases
    postgres
    postgis
    sqlite3
    mysql
db differeneces
    non returning
    sqlite no schemas




## openapi3 docs


### example app
link to demo apps showing node implementation








### example urls
```
# service_call
http://localhost:8080/sample-app-name/service/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t

# debug mode (no db call)
http://localhost:8080/sample-app-name/debug/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t
```

## example calls
blah blah blah
### REST
oooo
### GRAPHQL
oooo
### GRPC
oooo



## development notes

What worked for me was to:

    Delete the node_modules in both the dependency and the consumer module.
    Run npm unlink --no-save [dependency-module]
    re-link with the 2-link commands as per npm-link

Now I am able to fully test my unpublished module locally.

Additionally, there is an npm pack command which can help you test your unpublished modules, although not quite as robust.

### file watchers (I reach limits)
https://medium.com/@bestafiko/npm-npm-start-error-enospc-system-limit-for-number-of-file-watchers-reached-bdc0eab0a159

echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p

## design concept

- koa view --> STANDARDIZED QUERY & CONTEXT <-- GraphQL Resolver
- Validation & Knex Query Building
- Knex Execution






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



## logger log.msg

There is a basic structure of the logger statements. While you do need to review the various keys in the log statements, here is what I have catalogs along with desctiptions of the various values.

- service_call
  - general call

- CRUD CALLS TO CLASS
- context_errors
- validation_error
- resource_response
- resource_call

- in router (and needs to be in graphql)
- db_call_failed

- startup_failed

##  <a id="quick-start"></a>Quick Start

Docker is the quickest start. links here and here to docker image and template

