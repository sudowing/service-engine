export const CREATE = "create";
export const READ = "read";
export const UPDATE = "update";
export const DELETE = "delete";

export const UNDERSCORE_IDS = "_ids";
export const UNDERSCORE_BYKEY = "_byKey";
export const DOT = ".";
export const PIPE = "|";
export const EMPTY_STRING = "";

export const STRING = "string";
export const NUMBER = "number";
export const BOOLEAN = "boolean";
export const EQUAL = "equal";
export const QUOTED_VALUE = '"value"';
export const COMMA = ",";

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

export const PIPE_SEPERATOR = "|seperator";
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
  range: true,
  not_range: true,
  in: true,
  not_in: true,
  geo_bbox: true,
  geo_radius: true,
  geo_polygon: true,
};

export const DEFINED_ARG_LENGTHS = {
  range: 2,
  not_range: 2,
  geo_bbox: 4,
  geo_radius: 3,
};

export const SYMBOL_GEOQUERY = Symbol("geoquery");
export const SYMBOL_GEOQUERY_POINT = Symbol("geoquery-point");
export const SYMBOL_GEOQUERY_POLYGON = Symbol("geoquery-polygon");
export const SYMBOL_SOFT_DELETE = Symbol("soft_delete");
export const SYMBOL_UNIQUE_KEY_COMPONENT = Symbol(
  "symbol_unique_key_component"
);
export const SYMBOL_UPDATE_DISABLED = Symbol("update_disabled");
export const SYMBOL_CREATE_REQUIRED = Symbol("create_required");
export const SYMBOL_CREATE_DISABLED = Symbol("create_disabled");

export const SYMBOLS_GEO_POINT = [SYMBOL_GEOQUERY, SYMBOL_GEOQUERY_POINT];
export const SYMBOLS_GEO_POLYGON = [SYMBOL_GEOQUERY, SYMBOL_GEOQUERY_POLYGON];

export const FALSEY_STRING_VALUES = ["", "f", "false", "0"];

export const REQUIRED_FLAG = { presence: "required" };

export const SEARCH_QUERY_CONTEXT = {
  fields: undefined,
  seperator: COMMA,
  notWhere: undefined,
  statementContext: "and",
  orderBy: undefined,
  page: undefined,
  limit: undefined,
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
