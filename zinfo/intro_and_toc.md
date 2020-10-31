# Service-Engine

Service-Engine is an opinionated framework 
for publishing **REST** Endpoints, **GraphQL** Resolvers & **gRPC** Methods for database resources (tables, views and materialized views).
The goal is to provide a generalized method for quickly standing up a data access layer, providing **CRUD** functionality to commonly used SQL databases -- with a few bells and whistles thrown in.

[![Alt text](https://i3.ytimg.com/vi/ZeFpweKpIHo/maxresdefault.jpg)](https://www.youtube.com/watch?v=ZeFpweKpIHo)




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


On start,
- run migrations (if configured to do so)
- autodetect db resources (via inspection)
- builds validators for CREATE, READ, UPDATE, DELETE & SEARCH methods
- publishes REST endpoints, GraphQL resolvers & gRPC methods
- autogenerates OpenAPI3 documentation


