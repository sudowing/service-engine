# Service-Engine

Service-Engine is an opinionated framework 
for publishing **REST** Endpoints & **GraphQL** Resolvers for database resources (tables, views and materialized views).
The goal is to provide a generalized method for quickly standing up a data access layer, providing **CRUD** functionality to commonly used SQL databases -- with a few bells and whistles thrown in.

On start,
- autodetect db resources (via inspection)
- builds validators for all db resources
- publishes REST endpoints & GraphQL resolvers 
- autogenerate OpenAPI3 documentation


## What's the value here?

### REST **_and_** GraphQL.

I've worked in multiple shops where some subset of engineers had an interest in utilizing GraphQL -- but others were hesitent as REST was the office standard and learning any new tech takes time. This project is to support both so that the REST needs of today are satisfied, while also enabling those interested to explore GraphQL adoption.

### Validation at the Source

JOI validators are created for each resource -- or more acurately each CRUD method for each resource.

### Database Migrations

Migrations are an awesome way for managing changes to db state. Since this project will act as the DAL for a specific DB, it makes a logical place to also hold migration files.


### Most CRUD is Generic





--- 
## what about joins
Joins are supported in views.

## how about subqueries
Supported -- al beit a little clunky.









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
 - remove db drivers from apps. use standard http request methods to CRUD records to your dbs via REST + GraphQL
  - Abstraction at DB, enabled easier migration of db in future as limits callers to a single app, enabled automagic handling of parititons via middleware (which the service's callers will not be aware of)
- uuid per service call (reqId injected into each log and attached to each response header)
- verbose error messages in `response.body`
- horitonatlly scalable organization store
  - sibling project provides hub-and-spoke access to multiple implementations, providing single service to port-forward from k8s for easier dev-experience (while deployed apps can call the individual services directly)


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



## Foundational dependencies
 - knex
 - @sideways/joi
 - apollo

