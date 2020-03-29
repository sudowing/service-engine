# service-engine

https://medium.com/the-andela-way/scaling-out-with-node-clusters-1dca4a39a2a


/*

query
    #fields=alpha,bravo,charlie
    #subquery?=query
    field.gt
    field.gte
    field.lt
    field.lte
    field.not
    field.range=5-9
    field.in
    field.not_in
    field.like
    field.or
    field.geo_bbox=minLong, minLat, maxLong, maxLat
    field.geo_radius=lat, long, meters
    field.geo_polygon=polygon // also supports multipolygons
    field.geo_geojson=geojson



    if contains `.`

    gt
    gte
    lt
    lte
    not
    range
    in
    not_in
    like
    or
    geo_bbox
    geo_radius
    geo_polygon
    geo_geojson

*/

// need to confirm usage of GEOFIELD validator type
// was it used for points or polygons?
// I know it was used geojson generation on out/publish
// I think the gis functions were only done on points!
// will need two seperate validation types (number and string) to handle various inputs -- else dynamic typecast fn assignment
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
