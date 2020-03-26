export const UNDERSCORE_IDS = "_ids";
export const UNDERSCORE_BYKEY = "_byKey";
export const DOT = ".";



// values are weither they support multiple values seperated by commas
export const SUPPORTED_OPERATIONS = {
    eq: false,
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
    geo_polygon: true,
    geo_geojson: true,
  }
  