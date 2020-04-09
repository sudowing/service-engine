export const CREATE = "create";
export const READ = "read";
export const UPDATE = "update";
export const DELETE = "delete";

export const UNDERSCORE_IDS = "_ids";
export const UNDERSCORE_BYKEY = "_byKey";
export const DOT = ".";

export const STRING = "string";
export const NUMBER = "number";
export const BOOLEAN = "boolean";
export const EQUAL = "equal";
export const QUOTED_VALUE = '"value"';
export const COMMA = ",";

export const POINT = "point";
export const POLYGON = "polygon";

// values are weither they support multiple values seperated by commas
export const SUPPORTED_OPERATIONS = {
  [EQUAL]: false,
  gt: false,
  gte: false,
  lt: false,
  lte: false,
  not: false,
  like: false,
  range: true,
  in: true,
  not_in: true,
  geo_bbox: true,
  geo_radius: true,
  // geo_polygon: true,
  // geo_geojson: true,
};

export const DEFINED_ARG_LENGTHS = {
  range: 2,
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
