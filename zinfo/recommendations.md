

# Recommendations

## Database

If you have the option -- I'd select postgres. Not only does it support postgis, but it's got great support for partitions and partial indexes. Additionally -- a detail relevant to this project -- it supports `returning` on CREATE + UPDATE (unlike mysql & sqlite). That means you'll get records back, including fields that the db created (like ids) upon creation. MySQL & SQLite3 serve 201 no bodys.

## migrations from the jump

in deployed environments I would limit the creation of new db objects to the service account to be used by this service -- and I would remove permissions for destructive activies (and probably creative ones) from standard users.

If engineers want to hack or iterate through some ideas, local is the place to do so. Once things get created and owned by the service account, an entire class of problems disappear.

## soft delete

###### **not yet implemented**
removing user data is bad. I'd prefer do with via an active flag. Even to support with GDPR or CCPA requirements, I'd not support deleting via this service. instead -- this service should flip flags and an async worker should connect to the to this service via a special method to handle the user requested (and gov mandated) purge

