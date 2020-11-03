
# Application Configurations

## default page limit

BLAH BLAH BLAH

## Permissions

Service permissions are managed via permissions objects defined at the system & resource levels:

- `systemPermissions` apply to all db resources published on service (REST & GraphQL).
- `resourcePermissions` can be used to modify/overide permissions set for system.

Below is an example of how to configure permissions for the service:

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

const { App, logger, grpcService } = await ignite({
    db, metadata,
    systemPermissions,
    resourcePermissions,
});
```

## Middleware

Sometimes it can be useful to intercept an inbound query before submitting for processing. To accomplish this, this framework supports middleware -- which are a set of functions that take as `input` a **`query object`** and returns a new **`query object`** (that will still pass the validation).

This can be useful for appending submitted queries with additional search criteria deriving from the request **on-the-fly** -- like adding a partition key to a query or by appending a max bbox for a query using a geo point & zoom level.

Below is an example of how to configure permissions for the service:

```js
// object keys are resource endpoints `${schema}_${db_resource}` that are listed in the OpenAPI3 docs at `/openapi`
const resourceSearchMiddleware = {
  public_accounts: item => ({
    ...item,
    partition_key: !!item.email ? item.email.toLowerCase()[0] : null,
  }),
}

const { App, logger, grpcService } = await ignite({
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

Below is an example of how to configure complex resources for the service:

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

const { App, logger, grpcService } = await ignite({
  db,
  metadata,
  complexResources
});
```

##### **NOTE**: I know this is a bit clunky. I'll buy a beer for the person who comes up with something more elegant.

