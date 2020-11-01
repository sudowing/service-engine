

## Why not just Query the DB directly

Simply put -- _taste_.

Imaging if you work in a shop where you've got three applications and a handful of async jobs working from queues. Those processes need some method


use the prebuilt docker app that implements the framework. don't even need to implement it in node yourself.

Docker container & clonable template for migrations, configs and specifics

also -- this will free you from having to add db drivers to your apps and manage multiple connx to multiple dbs



## what about joins
Joins are supported in views.

## how about subqueries
Supported -- al beit a little clunky. I'll buy a beer for the person who comes up with something more elegant.

see: complex queries

## Explain automagic partition handling!

There exists a middleware method that allows you to intercept & manipulate inbound service queries **before** they get submitted for processing (validation & db query). Think hard coding some search param, appending a search param based on the query or other related things.

see: middleware
