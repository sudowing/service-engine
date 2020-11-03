
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
