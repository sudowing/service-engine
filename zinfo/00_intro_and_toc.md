# Service-Engine

Service-Engine is a framework for publishing generalized **REST**, **GraphQL** & **gRPC** Services that facilitate CRUD operations against the tables, views and materialized views of popular databases.

It can be implemented via an [NPM package](https://www.npmjs.com/package/service-engine) or as a [Docker Container](https://hub.docker.com/r/sudowing/service-engine).



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
