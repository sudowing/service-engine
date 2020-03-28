export const UNDERSCORE_IDS = "_ids";
export const UNDERSCORE_BYKEY = "_byKey";
export const DOT = ".";

export const STRING = "string";
export const NUMBER = "number";
export const BOOLEAN = "boolean";
export const EQUAL = "equal";
export const QUOTED_VALUE = '"value"';
export const COMMA = ',';

// values are weither they support multiple values seperated by commas
export const SUPPORTED_OPERATIONS = {
    equal: false,
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
}

export const DEFINED_ARG_LENGTHS = {
  range: 2,
  geo_bbox: 4,
  geo_radius: 3,
}

