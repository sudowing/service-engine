

# ~~Manifesto~~ What's the value here?

CRUD is Generic (_mostly_)

The unique features that make your product(s) stand out in the market deserve the lion's share of your bandwidth. As such, it's unlikely you have much _sincere interest_ in dedicating time building individual REST endpoints that map 1-to-1 to DB tables.

These tasks are tedious and mentally unchallenging (as the specs for the work are fully derived from the DDLs)

 this exercise can be. It's work that must be done... but why reinvent the wheel if this provides what you need?


This Framework builds derives resource definitions from the DB DDLs and 
1-to-1 to DB tables, views and materialized views.



## REST **and** GraphQL **and** gRPC

I've worked in multiple shops where some subset of engineers had an interest in utilizing `GraphQL` or `gRPC` -- but others were hesitent as `REST` was the office standard and learning any new tech takes time. A primary goal of this project is to support all three so that the `REST` needs of today are satisfied, while enabling `GraphQL` & `gRPC` evaluation/adoption.

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

When an application that has implemented this framework starts, there are several things


On start,
1. Run DB Migrations (if configured to do so)
2. Autodetects DB resources  (table, view or materialized view) via inspection
3. Builds [JOI validators](https://joi.dev) for all DB resources (distinct validator for each supported DQL & DML operation)
4. publishes REST, GraphQL & gRPC services that apply the appropriate validator for different `CRUD` operations


But if you've got multiple applications calling the DB, each application would need to provide this validation.

Additionally, if you've got an app calling multiple databases, your app will 

Centralize the validation of SQL statements to a single location.

If you're app has 3 DB dependencies, you'll need 3x the validation capabilities. If you use services that implement this framework to access your DBs... you'll still benefit from the validation feature -- but it won't be a native part of any app.


This is benefitial 

JOI validators are created for each resource -- or more acurately each CRUD method for each resource.

These validators prevent invalid db queries from reaching the database and also offloading validation requirements from clients.



---------
---------
---------
---------
---------
---------
---------
---------



## Database Migrations

Migrations are an awesome way for managing changes to db state. Since this project will act as the DAL for a specific DB, it makes a logical place to also hold migration files.



## geoqueries serving GeoJSON

Self host GIS systems



## horitonatlly scalable data stores

horitonatlly scalable data stores
sibling project provides hub-and-spoke access to multiple implementations, providing single service to port-forward from k8s for easier dev-experience (while deployed apps can call the individual services directly)




## facilitate future migration of backing services
Abstraction at DB, enabled easier migration of db in future as limits callers to a single app, enabled automagic handling of parititons via middleware (which the service's callers will not be aware of)

If you haven't been a part of a db to db migration - you haven't lived. These are complicated projects requiring a fair amount of planning and coordination before finally flipping the switch.
