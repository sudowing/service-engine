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

--- 
## what about joins
Joins are supported in views.

## how about subqueries
Supported -- al beit a little clunky. I'll buy a beer for the person who comes up with something more elegant.

see: complex queries
## Explain automagic partition handling!

There exists a middleware method that allows you to intercept & manipulate inbound service queries **before** they get submitted for processing (validation & db query). Think hard coding some search param, appending a search param based on the query or other related things.

see: middleware

## horitonatlly scalable data stores

horitonatlly scalable data stores
sibling project provides hub-and-spoke access to multiple implementations, providing single service to port-forward from k8s for easier dev-experience (while deployed apps can call the individual services directly)

# Interface Components

## Query Metadata

### Request Id

Each request get's a Request ID (uuid) assign, which get's attached to the response header and also injected into any log statements during the fulfillment of the request. This reqId should make searching for events related to a single call in your logs trivial.

### SQL

Each call (REST & GraphQL) ends up building a SQL query that in most cases get's executed. The actual SQL query is always available via a response header on REST calls (and available another way via GraphQL -- more to follow).

## Search Counts

Executing a paginated search is a standard operation, and in order to save an additional service call to request the count for a search query (in addition to the actual search providing results) -- the unpaginated count is available via the response header.

This way -- you can choose to request the count for the first page, which does result in 2 DB calls -- but then omit that flag for subsequent pages. GraphQL handles this a bit differently as there is a specific resolver for counts.

## Debug Mode

Every resource can be called in a normal mode, which submits valid queries to the DB and debug mode -- which stops at the DB's door. If you are interested in seeing how a given REST/GraphQL query was parsed, validation responses and the SQL query built (before it's executed) -- you can do so via debug mode in REST & GraphQL.

# Optional Configurations

### Middleware

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

### Complex Resources (subqueries)

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

const { App, logger } = await ignite({
  db,
  metadata,
  resourceSearchMiddleware,
  complexResources
});


```




### Permissions

permissions for db resources are managed via permissions objects.

```js
import { ignite, initPostProcessing, permit } from "service-engine";

// set system & resource. bitwise `OR` used to set resource level permissions
const systemPermissions = permit().none();
const resourcePermissions = {
  'schema.r': permit().read(),
  'schema.table.u': permit().update(),
  'schema.view.d': permit().delete(),
  'public.gis_osm_places_free_1': permit().create().read(),
  'schema.matView.cru': permit().create().read().update(),
  'schema.matView.c-r-u-d': permit().create().read().update().delete(),
  'schema.matView.crud': permit().crud(),
  'schema.matView.none': permit().none(),
  // sqlite3 has no schemas
  'table': permit().create().read().update().delete(),
  'view': permit().create().read().update().delete(),
}

const { App, logger } = await ignite({
    db, metadata, resourceSearchMiddleware, complexResources,
    systemPermissions,
    resourcePermissions,
});
```



### default page limit

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
- notWhere
- statementContext
- orderBy
- page
- limit

## Query Context
##### **NOTE:** Context in REST is always in 
## Query Makup
### example query
### example urls

# service_call
# debug mode (no db call)

### resource search middleware
### complexResources (subqueries & aggregation)



# Foundational dependencies

- knex: blah blah blah
- @sideways/joi: blah blah blah
- apollo: blah blah blah
- shin docs & mershin

--- 
header sql reqId count
returning Create and Update for supporting dbs


### existing dbs:
- service account that can execute inspection queries
- spaces in fields
- supported dbs
- migrations need write access
### greenfield projects:
postgres. go nuts.


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
- source for public dockerfile that implements this node lib
- clonable project that implements the public docker image, containing only the resources unique to an implementation (metadata, migration files, middleware, complex resources, permissions and env vars)
- demo project, complete with insomnia export that shows multiple CRUD calls via REST & GraphQL against all currenly supported DBs (postgres, mysql and sqlite3)
- local db quide, which shows you how to quickly setup and load demo postgres, postgis and mysql databases -- used for the demo project and your exploration of this framework


## unsupported characters

The schema name, resource name or field name. GraphQL SDL supports a limited set of ascii chars. It's possible your db uses unsupported characters and this will need to be resolved before you can get this service to run.
Either update the field names or use the permissions to prohibit publication of resources.

## DB write permissions

migrations will require write permissions.

