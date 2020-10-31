

# ~~Manifesto~~ Mission Statement


# What's the value here?

## Call DBs _via_ REST **and** GraphQL **and** gRPC

I've worked in multiple shops where some subset of engineers had an interest in utilizing `GraphQL` or `gRPC` -- but others were hesitent as `REST` was the office standard and learning any new tech takes time. A primary goal of this project is to support all three so that the REST needs of today are satisfied, while enabling `GraphQL` & `gRPC` evaluation/adoption.

## Most CRUD is Generic

The unique features that make your product(s) stand out in the market deserve the lion's share of your bandwidth. As such, it's unlikely you are _uninterested_ in dedicating much time building individual REST endpoints that map 1-to-1 to DB tables.



---

If you've done it more than once, you already know how tedious and mentally unchallenging this exercise can be. It's work that must be done... but 

 Why reinvent the wheel if this provides what you need?



ived from DDLs



ived from DDLs

## Why not just Query the DB directly

Simply put -- _taste_.

Imaging if you work in a shop where you've got three applications and a handful of async jobs working from queues. Those processes need some method


use the prebuilt docker app that implements the framework. don't even need to implement it in node yourself.

Docker container & clonable template for migrations, configs and specifics



## Prebuilt Docker Container

use the prebuilt docker app that implements the framework. don't even need to implement it in node yourself.

Docker container & clonable template for migrations, configs and specifics







## Validation at the Source

JOI validators are created for each resource -- or more acurately each CRUD method for each resource.

These validators prevent invalid db queries from reaching the database and also offloading validation requirements from clients.

## Database Migrations

Migrations are an awesome way for managing changes to db state. Since this project will act as the DAL for a specific DB, it makes a logical place to also hold migration files.


## facilitate future migration of backing services
Abstraction at DB, enabled easier migration of db in future as limits callers to a single app, enabled automagic handling of parititons via middleware (which the service's callers will not be aware of)

If you haven't been a part of a db to db migration - you haven't lived. These are complicated projects requiring a fair amount of planning and coordination before finally flipping the switch.

## horitonatlly scalable data stores

horitonatlly scalable data stores
sibling project provides hub-and-spoke access to multiple implementations, providing single service to port-forward from k8s for easier dev-experience (while deployed apps can call the individual services directly)


## geoqueries serving GeoJSON

Self host GIS systems


## what about joins
Joins are supported in views.

## how about subqueries
Supported -- al beit a little clunky. I'll buy a beer for the person who comes up with something more elegant.

see: complex queries

## Explain automagic partition handling!

There exists a middleware method that allows you to intercept & manipulate inbound service queries **before** they get submitted for processing (validation & db query). Think hard coding some search param, appending a search param based on the query or other related things.

see: middleware
