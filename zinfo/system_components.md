
# Key Concepts

Requests to applications implementing this framework are used to build SQL queries via the SQL Query Builder, [knex.js](http://knexjs.org).

While the call signatures for `REST`, `GraphQL` or `gRPC` each differ, each received request gets transformed to a common standard before for validation and execution.

## Standardized Query = Payload + Context

These standardized requests are made up of (among other things) a `payload` & `context`. Below is an example.

```json
{
	"payload": {
		"occupation": "engineer",
		"state.in": "NJ|PA",
		"handle.like": "sudo",
	},
	"context": {
		"page": 5,
		"limit": 3,
		"orderBy": "handle,name_first:desc",
		"fields": "id,handle,email,name_first",
		"seperator": "|"
	},
}
```



Some components of the 
service request are related to 

return fields, pagination, ordering, and a few other things -- these are defined a `context`

the comparison, logical and spacial type operators that are all supported are defined as the request `query`

a single REST call will have a `query` + `context` regardless of what CRUD method is being triggered.





SQL via REST & GraphQL

Query & Context

```sql
select
	  id
	, handle
	, email
	, name_first
from
	public.some_table -- REST call made to /public_some_table
where
	occupation = 'engineer'
	and
	state in ('NJ', 'PA')
	and	
	handle like 'sudo%'
order by
	  handle
	, name_first desc
limit 30
offset 120
```



Query = Supported SQL Operators
 - equal
 - gt
 - gte
 - lt
 - lte
 - not
 - like
 - null
 - not_null
 - in
 - not_in
 - range
 - not_range
 - geo_bbox
 - geo_radius
 - geo_polygon

Context = additional information to be used in - query
- fields
- seperator
- notWhere // The WHERE clause can be combined with AND, OR, and NOT operators.
- statementContext // The WHERE clause can be combined with AND, OR, and NOT operators.
- orderBy
- page
- limit (set for service in .env)





# Interface Components

## Query Metadata

There are several standardized components that exist in both REST & GraphQL interfaces.
REST data returns in Response Headers, while GraphQL data is returned in response types.


### Request Id

Each request get's a Request ID (uuid) assign, which get's attached to the response header and also injected into any log statements during the fulfillment of the request. This `reqId` should make searching for events related to a single call in your logs trivial.

always present
`x-request-id`

### SQL

Each call (REST, GraphQL or gRPC) ends up building a SQL query that in most cases get's executed (see [**debug mode**]()). The actual SQL query is always available via a response header on REST (as `x-sql`) calls and available another way via GraphQL.

`x-get-sql`
`x-sql`


### Search Counts

Executing a paginated search is a standard operation, and in order to save an additional service call to request the count for a search query (in addition to the actual search providing results) -- the unpaginated count is available via the response header.

This way -- you can choose to request the count for the first page, which does result in 2 DB calls -- but then omit that flag for subsequent pages. GraphQL handles this a bit differently as there is a specific resolver for counts.


`x-get-count`
`x-count`




------


# SQL -- from afar

## geoqueries
  geoqueries are support in postgis where fields are geo types

  also note that postgre WKT will be converted to geojson automatically while mysql will just stay as it's json representation





## validation -- based on db models
validate search interfaces, fields requested, etc
- verbose error messages in `response.body`

## Query Context

Inbound calls for Search Resources (REST & GraphQL) accept a query context that is used to define the sql to be executed. Additionally -- all resources support `fields` context, meaning no matter what operation you are executing, you can limit the fields being returned.

##### **NOTE:** Context in REST is always in 
## Query Makup
### example query
### example urls






## Debug Mode

Every resource can be called in a normal mode, which submits valid queries to the DB and debug mode -- which stops at the DB's door. If you are interested in seeing how a given REST/GraphQL query was parsed, validation responses and the SQL query built (before it's executed) -- you can do so via debug mode in REST & GraphQL.



### example urls
```
# service_call
http://localhost:8080/sample-app-name/service/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t

# debug mode (no db call)
http://localhost:8080/sample-app-name/debug/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t
```



## logger log.msg

There is a basic structure of the logger statements. While you do need to review the various keys in the log statements, here is what I have catalogs along with desctiptions of the various values.

- service_call
  - general call

- CRUD CALLS TO CLASS
- context_errors
- validation_error
- resource_response
- resource_call

- in router (and needs to be in graphql)
- db_call_failed

- startup_failed

