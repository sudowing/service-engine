# service-engine

https://medium.com/the-andela-way/scaling-out-with-node-clusters-1dca4a39a2a



```
geoqueries were only ever done on the `center`. Anything marked as a geo field in the validator was published as geoJson
```
Guidance I got was to use QGIS to import shapefiles and export as WKT (well known text) as that's how we stored data.

https://qgis.org/en/site/forusers/alldownloads.html#fedora
https://postgis.net/workshops/postgis-intro/loading_data.html


```
2

What worked for me was to:

    Delete the node_modules in both the dependency and the consumer module.
    Run npm unlink --no-save [dependency-module]
    re-link with the 2-link commands as per npm-link

Now I am able to fully test my unpublished module locally.

Additionally, there is an npm pack command which can help you test your unpublished modules, although not quite as robust.
```

dynamic seperator? comma and pipe
dynamic field/column labels

pagination
    page
    limit
order

geoquery on point only




// parse polygon values
// polygon passed in url as base64 to avoid comma parsing
const parsedPolygon = Buffer.from(
    polygon || cnst.EMPTY_STRING,
    cnst.BASE_64
).toString();



any db supported by knex

Validation at the source
Auto Generating documentation for REST resources (openapi)

CRUD
    create single/multiple
    update single/multiple/batch by search
    soft delete single/multiple/batch by search
    hard delete single/multiple/batch by search
    read single/search


COMPARISON
LIKE
RANGE & NOT_RANGE
IN & NOT_IN
NULL & NOT_NULL
GIS Queries
    BBOX
    RADIUS
    POLYGON


fields
orderBy
page
limit
seperator
notWhere // The WHERE clause can be combined with AND, OR, and NOT operators.
statementContext // The WHERE clause can be combined with AND, OR, and NOT operators.

complex read queries by views
    benefits:
        catalog of queries used by the app


remove db drivers from apps. use standard http request methods to CRUD records to your dbs via REST + GraphQL
Abstraction at DB, enabled easier migration of db in future as limits callers to a single app, enabled automagic handling of parititons via middleware (which the service's callers will not be aware of)

logging logging logging
uuid per service call
verbose error messages

horitonatlly scalable organization store
    sibling project provides hub-and-spoke access to multiple implementations, providing single service to port-forward from k8s for easier dev-experience (while deployed apps can call the individual services directly)
