
# <a id="key-concepts-interfaces"></a>Key Concepts & Interfaces

## <a id="key-concepts-interfaces_sql-from-afar"></a>SQL - From Afar

Requests to this server are used to build SQL queries via the SQL Query Builder, [knex.js](http://knexjs.org). While the call signatures for `REST`, `GraphQL` or `gRPC` each differ, each received request gets transformed to a common standard before for validation and execution.

And if you understand how each request gets processed after getting standardized, it should help you understand the various interfaces.

## <a id="key-concepts-interfaces_standardized-query-payload-context"></a>Standardized Query = Payload + Context

Standardized API Requests are comprised of (among other things) a `payload` & `context`. Below is an example of what this standardized object looks like after it's been standardized.

```json
{
	"payload": {
		"occupation": "engineer",
		"state.in": "NJ|PA",
		"handle.like": "sudo%",
	},
	"context": {
		"page": 5,
		"limit": 3,
		"orderBy": "handle,name_last:desc",
		"fields": "id,handle,email,name_first",
		"seperator": "|"
	},
}
```

The **`query`** object above would get validated to ensure all fields requested to be returned and all used for ordering exist on the target resource, the `keys` in the `payload` are fields in the target table, and that the `values` in `payload` are **[A]** of the correct data type and **[B]** the operators used on fields (ex `.like` or `.in`) have the correct number of args and type if the operator has requirements (range, geoquery, etc. have these kinds of requirements).

If **invalid**, the application will respond with a meaningful, verbose message indicating what the issue was with the request.

If **valid**, The **`query`** would get passed to a function that would build `SQL` to be executed against the DB.

## <a id="key-concepts-interfaces_standardized-query-to-sql"></a>Standardized Query to SQL

As an example, the **`query`** object above would produce the `SQL` below:

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
	, name_last desc
limit 30
offset 120
```

## <a id="key-concepts-interfaces_supported-sql-operators"></a>Supported SQL Operators

The example above uses three **operators** (`equal`, `in`, `like`), this Framework supports sixteen `operators`. The table below details each supported **operator**, how it's implemented in `REST`, if it will support multiple seperated values and if the operator has a fixed number of arguments.

|field.**`operator`**|sql operator|multiple seperated args|# of args|
|---|:-:|:-:|:-:|
|field|= (default)|false||
|field.`equal`|=|false||
|field.`gt`|>|false||
|field.`gte`|>=|false||
|field.`lt`|<|false||
|field.`lte`|<=|false||
|field.`not`|<>|false||
|field.`like`|like|false||
|field.`null`|is null|false||
|field.`not_null`|is not null|false||
|field.`in`|in (...values)|true||
|field.`not_in`|not in (...values)|true||
|field.`range`|between `x` and `y`|true|2|
|field.`not_range`|not between `x` and `y`|true|2|
|field.`geo_bbox`|geo_bbox|true|4|
|field.`geo_radius`|geo_radius|true|3|
|field.`geo_polygon`|geo_polygon|false||


## <a id="key-concepts-interfaces_supported-context-keys"></a>Supported Context Keys

Inbound calls for Search Resources (REST & GraphQL) accept a query context that is used to define the sql to be executed. Additionally -- all resources support `fields` context, meaning no matter what operation you are executing, you can limit the fields being returned.

Below are all the supported `context` keys available for use within a query:

|key|description|
|---|:-:|
|fields|fields to return from the SQL query|
|seperator|seperator used to seperator values submitted in request (default is `","`|
|orderBy|fields to order results by. can accept multiple values seperated by `","`. Format: `field:desc` (`:asc` is default so you can omit)|
|page|Pagination Page|
|limit|Pagination Limit| (set for service in .env)
|notWhere|The WHERE clause can be combined with AND, OR, and NOT operators. **NOT IMPLEMENTED**|
|statementContext|The WHERE clause can be combined with AND, OR, and NOT operators. **NOT IMPLEMENTED**|

##### <a id-note-context-in-rest-is-always-in-querty-string-this-is"></a>**NOTE:** Context in REST is always in querty string. This is useful for returning fields on `CREATE` & `UPDATE.`

## <a id="key-concepts-interfaces_query-metadata"></a>Query Metadata

There are several standardized components that exist in both `REST` & `GraphQL` interfaces.
`REST` data returns in Response Headers, while `GraphQL` data is returned in response types. `gRPC` currently does not support these features.

### <a id="key-concepts-interfaces_query-metadata_request-id"></a>Request Id

Each request gets a Request ID (uuid) assigned, which is is attached to the response header and also injected into any log statements during the fulfillment of the request. This `reqId` should make searching for events related to a single call in your logs trivial.

|request-header|value|response-header|description|
|---|---|---|---|
|N/A|N/A|`x-request-id`|UUID assigned to request for injection into logs and troubleshooting of calls.|

### <a id="key-concepts-interfaces_query-metadata_sql"></a>SQL

Each call (`REST`, `GraphQL` or `gRPC`) ends up building a SQL query that in most cases get's executed (see [**debug mode**]()). The actual SQL query is always available via a response header on `REST` calls (as `x-sql`) and available another way via GraphQL.

|request-header|value|response-header|description|
|---|---|---|---|
|`x-get-sql`|truthy|`x-sql`|SQL built by service|


### <a id="key-concepts-interfaces_query-metadata_search-counts"></a>Search Counts

Executing a paginated search is a standard operation, and in order to save an additional service call to request the count for a search query (in addition to the actual search providing results) -- the unpaginated count is available via the response header.

This way -- you can choose to request the count for the first page, which does result in 2 DB calls -- but then omit that flag for subsequent pages. `GraphQL` and `gRPC` handles this a bit differently, but they function in very similar manners.

|request-header|value|response-header|description|
|---|---|---|---|
|`x-get-count`|truthy|`x-count`|unpaginated count for submitted query (even if request was paginated)|

## <a id="key-concepts-interfaces_debug-mode"></a>Debug Mode

Every resource can be called in a normal mode, which submits valid queries to the DB and debug mode -- which stops at the DB's door. If you are interested in seeing how a given REST/GraphQL query was parsed, validation responses and the SQL query built (before it's executed) -- you can do so via debug mode in REST & GraphQL.

### <a id="key-concepts-interfaces_debug-mode_example-urls"></a>Example URLs
```
# service_call
http://localhost:8080/sample-app-name/service/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t

# debug mode (no db call)
http://localhost:8080/sample-app-name/debug/${schema}_${table}/?|orderBy=uuid:desc&|limit=3&|page=10&|fields=id,uuid&active=t
```
