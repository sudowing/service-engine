## Prebuilt Docker Container

use the prebuilt docker app that implements the framework. don't even need to implement it in node yourself.

Docker container & clonable template for migrations, configs and specifics


## what about joins
Joins are supported in views.

## how about subqueries
Supported -- al beit a little clunky. I'll buy a beer for the person who comes up with something more elegant.

see: complex queries

## Explain automagic partition handling!

There exists a middleware method that allows you to intercept & manipulate inbound service queries **before** they get submitted for processing (validation & db query). Think hard coding some search param, appending a search param based on the query or other related things.

see: middleware
