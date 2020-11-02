

# Overview

The unique features that make your product(s) stand out in the market deserve the lion's share of your bandwidth. As such, it's unlikely you have much _sincere_ interest in dedicating time building `REST` endpoints that map 1-to-1 to DB tables.

These tasks are tedious and unchallenging -- as the specs for the work are fully derived from DB DDLs -- but if you desire `REST` access... it must be accomplished.

This Framework aims to solve that.

## REST **and** GraphQL **and** gRPC

I've worked in multiple shops where some subset of engineers had an interest in utilizing `GraphQL` or `gRPC`, while others were hesitent as `REST` was the office standard and learning any new tech takes time. A primary goal of this project is to support all three so that the `REST` needs of today are satisfied, while enabling `GraphQL` & `gRPC` evaluation/adoption.

## Auto Inspection

The resources provivisioned by the server for the various services (`REST` endpoints, `GraphQL` resolvers & `gRPC` methods) are built based on the results of a query that surveys the DB and returns back a list of all fields within all tables, views or materialized views for all schemas.

## Validation at the Source

### Overview
A core benefit of implementing this framework is offloading the **`validation`** a given DB request from other backend processes.

This is benefitial for a few reasons, but before we discuss let's consider how a basic request to a `REST` endpont would get handled.

1. A user calls a `REST` endpoint
2. The **view** processing the request will assembles an object from headers, query string and body.
3. **This object gets validated to ensure it will do no harm and should be executed**
4. The object is transformed to `SQL` and get's sent to the DB for execution.

The example above show some general processing that occurs before a `REST` request gets sent to a DB. The same steps exist in GraphQL and gRPC -- so we'll just focus on **#3** as we discuss the value of this feature.


### How it works

When an server starts, the following tasks get executed:

1. Run DB Migrations (if configured to do so)
2. Autodetects DB resources  (table, view or materialized view) via inspection
3. Builds [JOI validators](https://joi.dev) for all DB resources (distinct validator for each supported DQL & DML operation)
4. Publishes `REST`, `GraphQL` & `gRPC` services that apply the appropriate validator for different `CRUD` operations

### What this is positive


If you've got multiple applications calling the same DB, each application will need implement validation. If you are doing your best to follow the [DRY principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself), one option would be to place the validators inside a dedicated package, then implement that within each app calling the service (this would also be a fine place to share SQL queries).

While this is a fine strategy, the package holding these validators would be a code dependency (across multiple applications), which would require updates with each modification to the database.

Instead, the approach provided here is to simply offload the validation to the server implementing this `service-engine`, which would respond to the caller with either the query results (for valid requests) or a verbose error message (for invalid requests).

## Database Migrations

Database migrations (a.k.a. [Schema Migrations](https://en.wikipedia.org/wiki/Schema_migration)) are an awesome way for managing changes to db state and since this project will act as the DAL for a specific DB, it makes a logical place to also hold migration files.

If implementing this service by forking the [Dockerized Template project](https://github.com/sudowing/service-engine-template), you will just be building the migration files manually and placing them in the appropriate directory.

If implementing in `node`, you'll be following the [knex migration docs](http://knexjs.org/#Migrations).

## GIS Support

If the DB powering this service is `PostgreSQL` with the `postgis` extension enabled, you will 

This feature works by identifying any fields of a geometric type (as reported in the initial DB survey on startup) and enabling various spacial type functions (`st_*`) via **SEARCH methods**.

Additionally, any fields of this type are published as GeoJSON (after being transformed from WKT).

Current support for spacial search functions include:
- Radius ([ST_Intersects](https://postgis.net/docs/ST_Intersects.html))
- Bounding Box ([ST_Intersects](https://postgis.net/docs/ST_Intersects.html) & [ST_MakeEnvelope](http://www.postgis.net/docs/ST_MakeEnvelope.html))
- Custom Polygon ([ST_Intersects](https://postgis.net/docs/ST_Intersects.html) & [ST_GeomFromText](http://www.postgis.net/docs/ST_GeomFromText.html))

## Enable Future Migration of Database Environments

By abstracting the DB, you make it easier to manage changes DB versions or introduce optimizations like DB partitioning. This is possible because if applications are calling this service instead of the DB directly, you reduce the number of places where the DB changes need to be introduced.

It may sound absurd to some readers to be 
support fo, 

but if you haven't been a part of a DB to DB migration - you haven't lived. These are complicated projects requiring a fair amount of planning and coordination before finally flipping the switch.

## Reduce Dependencies Across Ecosystem

The need for jdbc/odbc drivers, and the packages that leverage them, will not be needed because this application will be exposeing 
`REST`, `GraphQL` & `gRPC` Services for interacting with the DB.

As a result, native features (like [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)) or lighter dependencies (like [gRPC](https://www.npmjs.com/package/@grpc/grpc-js)) can be used instead.

