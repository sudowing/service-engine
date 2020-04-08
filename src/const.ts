export const UNDERSCORE_IDS = "_ids";
export const UNDERSCORE_BYKEY = "_byKey";
export const DOT = ".";

export const STRING = "string";
export const NUMBER = "number";
export const BOOLEAN = "boolean";
export const EQUAL = "equal";
export const QUOTED_VALUE = '"value"';
export const COMMA = ",";

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
export const SYMBOL_UNIQUE_KEY_COMPONENT = Symbol("SYMBOL_UNIQUE_KEY_COMPONENT");
export const SYMBOL_NO_UPDATE = Symbol("no_update");
export const SYMBOL_CREATE_REQUIREMENT = Symbol("create_requirement");

export const FALSEY_STRING_VALUES = ["", "f", "false", "0"];

export const REQUIRED_FLAG = { presence: "required" };
