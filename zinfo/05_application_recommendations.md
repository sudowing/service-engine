

# Database Recommendations

## Database | PostgreSQL

If you have the option -- I recommend PostgreSQL. Not only does it support [PostGIS](https://postgis.net/), but it's got great support for [table partitioning](https://www.postgresql.org/docs/12/indexes-partial.html) and [partial indexes](https://www.postgresql.org/docs/12/indexes-partial.html).
Additionally, a detail relevant to this project, PostgreSQL supports **returning** on [data manipulation](https://www.postgresql.org/docs/12/dml-returning.html) (CREATE + UPDATE) --  which means you'll get records back, including fields that the db created (like ids) upon creation.

MySQL & SQLite3 do not support this feature, and as a result `REST` Create & Update calls serve 201 no bodys. `GraphQL` and `gRPC` calls function in a similar manner.









---

## Change Management | DB Migrations

in deployed environments I would limit the creation of new db objects to the service account to be used by this service -- and I would remove permissions for destructive activies (and probably creative ones) from standard users.

If engineers want to hack or iterate through some ideas, local is the place to do so. Once things get created and owned by the service account, an entire class of problems disappear.

## soft delete

###### **not yet implemented**
Removing user data is dangerous.

If you give them features to delete records in bulk -- they'll misuse it.
If you give engineers the ability 


I'd prefer do with via an active flag. Even to support with GDPR or CCPA requirements, I'd not support deleting via this service. instead -- this service should flip flags and an async worker should connect to the to this service via a special method to handle the user requested (and gov mandated) purge

## Prebuilt Docker Container

use the prebuilt docker app that implements the framework. don't even need to implement it in node yourself.

Docker container & clonable template for migrations, configs and specifics

