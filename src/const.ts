export const DEFAULT_GRPC_PORT = 50051;
export const DEFAULT_REST_PORT = 8080;

export const CREATE = "create";
export const READ = "read";
export const UPDATE = "update";
export const DELETE = "delete";
export const SEARCH = "search";
export const SUBQUERY = "subquery";

export const GET = "GET";
export const POST = "POST";
export const PUT = "PUT";
export const PATCH = "PATCH";

export const UNDERSCORE_IDS = "_ids";
export const UNDERSCORE_BYKEY = "_byKey";
export const UNDERSCORE_INNER = "_inner";
export const CHILDREN = "children";

export const DOT = ".";
export const PIPE = "|";
export const EMPTY_STRING = "";
export const COMMA = ",";
export const COLON = ":";

export const STRING = "string";
export const NUMBER = "number";
export const BOOLEAN = "boolean";
export const EQUAL = "equal";
export const QUOTED_VALUE = '"value"';

export const FIELDS = "fields";
export const ORDERBY = "orderBy";
export const DISTINCT = "distinct";
export const PAGE = "page";
export const LIMIT = "limit";
export const NOTWHERE = "notWhere";

export const DESC = "desc";
export const ASC = "asc";

export const POINT = "point";
export const POLYGON = "polygon";

export const RANGE = "range";
export const NOT_RANGE = "not_range";
export const IN = "in";
export const NOT_IN = "not_in";
export const NULL = "null";
export const NOT_NULL = "not_null";
export const GEO_BBOX = "geo_bbox";
export const GEO_RADIUS = "geo_radius";
export const GEO_POLYGON = "geo_polygon";

export const JSON = "json";
export const JSONB = "jsonb";
export const BIT = "bit";
export const TINYINT = "tinyint";
export const SMALLINT = "smallint";
export const MEDIUMINT = "mediumint";
export const INT = "int";
export const INTEGER = "integer";
export const YEAR = "year";
export const GEOMETRY = "geometry";
export const LINESTRING = "linestring";
export const MULTIPOINT = "multipoint";
export const MULTILINESTRING = "multilinestring";
export const MULTIPOLYGON = "multipolygon";
export const GEOMETRYCOLLECTION = "geometrycollection";

export const PIPE_SEPERATOR = "|seperator";
export const SEPERATOR = "seperator";
// values are weither they support multiple values seperated by commas
export const SUPPORTED_OPERATIONS = {
  [EQUAL]: false,
  gt: false,
  gte: false,
  lt: false,
  lte: false,
  not: false,
  like: false,
  null: false,
  not_null: false,
  in: true,
  not_in: true,
  range: true,
  not_range: true,
  geo_bbox: true,
  geo_radius: true,
  geo_polygon: false,
};
export const DEFINED_ARG_LENGTHS = {
  range: 2,
  not_range: 2,
  geo_bbox: 4,
  geo_radius: 3,
};

export const SYMBOL_JSON = Symbol("json");
export const SYMBOL_GEOQUERY = Symbol("geoquery");

export const SYMBOL_GEOQUERY_POINT = Symbol("geoquery-point");
export const SYMBOL_GEOQUERY_LINE = Symbol("geoquery-line");
export const SYMBOL_GEOQUERY_LSEG = Symbol("geoquery-lseg");
export const SYMBOL_GEOQUERY_BOX = Symbol("geoquery-box");
export const SYMBOL_GEOQUERY_PATH = Symbol("geoquery-path");
export const SYMBOL_GEOQUERY_POLYGON = Symbol("geoquery-polygon");
export const SYMBOL_GEOQUERY_CIRCLE = Symbol("geoquery-circle");

export const SYMBOLS_GEO_POINT = [SYMBOL_GEOQUERY, SYMBOL_GEOQUERY_POINT];
export const SYMBOLS_GEO_LINE = [SYMBOL_GEOQUERY, SYMBOL_GEOQUERY_LINE];
export const SYMBOLS_GEO_LSEG = [SYMBOL_GEOQUERY, SYMBOL_GEOQUERY_LSEG];
export const SYMBOLS_GEO_BOX = [SYMBOL_GEOQUERY, SYMBOL_GEOQUERY_BOX];
export const SYMBOLS_GEO_PATH = [SYMBOL_GEOQUERY, SYMBOL_GEOQUERY_PATH];
export const SYMBOLS_GEO_POLYGON = [SYMBOL_GEOQUERY, SYMBOL_GEOQUERY_POLYGON];
export const SYMBOLS_GEO_CIRCLE = [SYMBOL_GEOQUERY, SYMBOL_GEOQUERY_CIRCLE];

export const SYMBOL_SOFT_DELETE = Symbol("soft_delete");
export const SYMBOL_UNIQUE_KEY_COMPONENT = Symbol(
  "symbol_unique_key_component"
);
export const SYMBOL_UPDATE_DISABLED = Symbol("update_disabled");
export const SYMBOL_CREATE_REQUIRED = Symbol("create_required");
export const SYMBOL_CREATE_DISABLED = Symbol("create_disabled");

export const FALSEY_STRING_VALUES = ["", "f", "false", "0"];

export const REQUIRED_FLAG = { presence: "required" };

export const SEARCH_QUERY_CONTEXT = {
  fields: undefined,
  seperator: COMMA, // used
  notWhere: undefined,
  statementContext: "and",
  orderBy: undefined,
  distinct: undefined,
  page: undefined,
  limit: undefined,
};

export const SEARCH_SUBQUERY_CONTEXT = {
  seperator: COMMA, // used
  notWhere: undefined,
  statementContext: "and",
};

export const SEARCH_QUERY_CONTEXT_DESCRIPTION = {
  fields: "record fields to return in results",
  seperator:
    "character to be used as seperator in context & operations values. default is pipe `|`",
  notWhere:
    "SQL query context. Apply query components to where OR get the inverse. Default is false.",
  statementContext:
    "SQL query context. Apply query components all together (and each) OR select any matching (OR).",
  orderBy:
    "seperated list of orderBy fields + direction (field desc || field asc). acs is default.",
  distinct: "return distinct records from result set",
  page: "pagination page",
  limit: "pagination limit",
  "x-get-count":
    "Request Search Query count(*) be sent back in a response header.",
  "x-get-sql": "Request plaintext SQL be sent back in a response header.",
};

export const SRID = 4326;
export const DD_BASE = 1113200;

export const BASIC_QUERY_OPERATIONS = new Map();
BASIC_QUERY_OPERATIONS.set("gt", ">");
BASIC_QUERY_OPERATIONS.set("gte", ">=");
BASIC_QUERY_OPERATIONS.set("lt", "<");
BASIC_QUERY_OPERATIONS.set("lte", "<=");
BASIC_QUERY_OPERATIONS.set("equal", "=");
BASIC_QUERY_OPERATIONS.set("like", "like");
BASIC_QUERY_OPERATIONS.set("not", "<>");

export const CONTEXT_ERRORS = "context_errors";
export const VALIDATION_ERROR = "validation_error";
export const RESOURCE_RESPONSE = "resource_response";
export const RESOURCE_CALL = "resource_call";
export const DB_CALL_FAILED = "db_call_failed";

export const STARTUP_FAILED = "startup_failed";

export const URL_ROOT_SERVICE = "/service";
export const DEBUG = "debug";
export const SERVICE = "service";

export const HEADER_REQUEST_ID = "x-request-id";
export const HEADER_GET_SQL = "x-get-sql";
export const HEADER_SQL = "x-sql";
export const HEADER_GET_COUNT = "x-get-count";
export const HEADER_COUNT = "x-count";

export const REGEX_CHAR = /(character|varchar|nchar|varying)\((?<len>\d+)\)/;
export const REGEX_NON_DIGIT = /\D/g;

export const DEFAULT_PAGINATION_LIMIT = 250;

export const SERVICE_VERSION =
  process.env.APP_VERSION || process.env.npm_package_version || "99.98.976"; // get app version

export const SERVICE_RESOURCE_NOT_FOUND_BODY = {
  message: `use the checklist below to determine why you have received this response`,
  checklist: [
    `db resource (table, view, matView) must exist`,
    `db resources are enabled via configured permissions: check systemPermissions & resourcePermissions`,
    `category must be "debug" or "service"`,
    `url structure "/:category/:resource/record" does not have a trailing slash`,
    `HTTP method does not map to supported db CRUD operation for this resource`,
  ],
};

export const COMPLEX_RESOLVER_SEPERATOR = "_subquery_";

export const NON_RETURNING_SUCCESS_RESPONSE = { success: true };
export const NON_RETURNING_FAILURE_RESPONSE = { success: false };
export const UNIQUE_RECORD_NOT_FOUND_WITH_KEYS =
  "Unique Record Not Found with those keys";

export const UNSUPPORTED_CHARACTER_IN_DB =
  "DB resource name or field contains character unsupported in GraphQL SDL (schema definition language). Supported characters are limited to `[0-9a-zA-Z_]` in all three `fieldsOfConcern`. Review each field within the `problemResources` records. Solutions would include updating the DDL to a name that is supported of omitting the resource from this service via a startup config";

export const BAD_CONFIG_COMPLEX_RESOURCE =
  "one of the resources provided for a complexResource does not exist. Make sure both are reflected in the DB as tables, views or materialized views. They must exist at boot so this system can auto generate the appropriate JOI validators -- which drive all of the REST & GraphQL interfaces (and auto documentation)";

export const BAD_GRPC_BIND = "gRPC Service not bound to ports";

export const PERMIT_CREATE = 1;
export const PERMIT_READ = 2;
export const PERMIT_UPDATE = 4;
export const PERMIT_DELETE = 8;
// tslint:disable: no-bitwise
export const PERMIT_CRUD =
  PERMIT_CREATE | PERMIT_READ | PERMIT_UPDATE | PERMIT_DELETE;

export const NEW_LINE = `
        `;

export const DEFAULT_MIGRATION_SCRIPT_NAME = "migration_by_sql_dir";

export const DEFAULT_MIGRATION_CONTENT = {
  up: [],
  down: [],
};
