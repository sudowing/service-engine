import * as Joi from "joi";

import * as cnst from "../const";

export const testKeyedTable = Joi.object({
  alpha: Joi.string().invalid(cnst.SYMBOL_UNIQUE_KEY_COMPONENT),
  bravo: Joi.number().invalid(cnst.SYMBOL_UNIQUE_KEY_COMPONENT),
  charlie: Joi.boolean().invalid(cnst.SYMBOL_UNIQUE_KEY_COMPONENT),
  mike: Joi.string(),
  xray: Joi.number().invalid(...cnst.SYMBOLS_GEO_POINT),
  yankee: Joi.number().invalid(...cnst.SYMBOLS_GEO_POLYGON),
  zulu: Joi.boolean().invalid(cnst.SYMBOL_SOFT_DELETE),
});

export const apiType01 = "REST";

export const testTable = Joi.object({
  alpha: Joi.string().required(),
  bravo: Joi.string(),
  charlie: Joi.number(),
  delta: Joi.number().integer(),
  echo: Joi.boolean(),
  foxtrot: Joi.number(),
  golf: Joi.string(),
  hotel: Joi.string().required(),
  mike: Joi.number().invalid(cnst.SYMBOL_GEOQUERY, cnst.SYMBOL_GEOQUERY_POINT),
  november: Joi.number().invalid(
    cnst.SYMBOL_GEOQUERY,
    cnst.SYMBOL_GEOQUERY_POLYGON
  ),
  oscar: Joi.number().invalid(cnst.SYMBOL_GEOQUERY, cnst.SYMBOL_GEOQUERY_POINT),
  papa: Joi.number().invalid(
    cnst.SYMBOL_GEOQUERY,
    cnst.SYMBOL_GEOQUERY_POLYGON
  ),
  zulu: Joi.boolean().invalid(cnst.SYMBOL_SOFT_DELETE),
});

export const initDescribeOriginal = {
  alpha: {
    type: "string",
    required: true,
    geoqueryType: null,
    softDeleteFlag: false,
  },
  bravo: {
    type: "number",
    required: true,
    geoqueryType: null,
    softDeleteFlag: false,
  },
  charlie: {
    type: "boolean",
    required: true,
    geoqueryType: null,
    softDeleteFlag: false,
  },
  mike: {
    type: "string",
    required: false,
    geoqueryType: null,
    softDeleteFlag: false,
  },
  xray: {
    type: "number",
    required: false,
    geoqueryType: "point",
    softDeleteFlag: false,
  },
  yankee: {
    type: "number",
    required: false,
    geoqueryType: "polygon",
    softDeleteFlag: false,
  },
  zulu: {
    type: "boolean",
    required: false,
    geoqueryType: null,
    softDeleteFlag: true,
  },
};

export const initDescribeBizarro = {
  alpha: {
    type: "string",
    required: false,
    geoqueryType: null,
    softDeleteFlag: false,
  },
  bravo: {
    type: "number",
    required: false,
    geoqueryType: null,
    softDeleteFlag: false,
  },
  charlie: {
    type: "boolean",
    required: false,
    geoqueryType: null,
    softDeleteFlag: false,
  },
  mike: {
    type: "string",
    required: false,
    geoqueryType: null,
    softDeleteFlag: false,
  },
  xray: {
    type: "number",
    required: false,
    geoqueryType: "point",
    softDeleteFlag: false,
  },
  yankee: {
    type: "number",
    required: false,
    geoqueryType: "polygon",
    softDeleteFlag: false,
  },
  zulu: {
    type: "boolean",
    required: false,
    geoqueryType: null,
    softDeleteFlag: true,
  },
};

export const validationInputs = {
  input: {
    number: "123",
    string: "some_string",
    boolean: "blah blah blah",
  },
  output: {
    number: 123,
    string: "some_string",
    boolean: true,
  },
};

export const productConcatErrorMessages = [
  "alpha 'the_black_keys' argument #1",
  "bravo 'the_black_keys' argument #3",
  "charlie 'the_black_keys' argument #5",
];

export const exampleSearchQuery = {
  zulu: "true",
  // field_gt: "field__gt",
  // field_gte: "field__gte",
  // field_lt: "field__lt",
  // field_lte: "field__lte",
  // field_not: "field__not",
  // field_range: "field__range",
  // field_in: "field__in",
  // field_not_in: "field__not_in",
  // field_like: "field__like",
  // field_or: "field__or",
  // field_geo_bbox: "field__geo_bbox",
  // field_geo_radius: "field__geo_radius",
  // field_geo_polygon: "field__geo_polygon",
  // field_geo_geojson: "field__geo_geojson",
  "alpha.gt": "field.gt",
  "bravo.gte": "field.gte",
  charlie: "zZasdfoiwer0sadf",
  "charlie.lt": "42",
  "delta.lte": "111",
  "echo.not": "field.not",
  "foxtrot.range": "5.1,9.7",
  "golf.in": "braves,marlins,nationals,mets,phillies",
  "hotel.not_in": "braves,marlins,nationals,mets,phillies",
  "alpha.like": "field.like",
  "mike.geo_bbox": "1.1,2.2,3.3,4.4",
  "november.geo_radius": "1.2,2.3,111000",
  // "mike.geo_bbox": "one, two, three, four",
  // "november.geo_radius": "one, two, three",
  "alpha.range": "5.1,9.7,9,8,7,6,5",
  "charlie.range": "5q1,9r7",
  "alpha.not_a_real_operation": "yada yada yada",
  not_a_real_prop: "5.1,9.7",
  "fake_prop.in": "5.1,9.7",
};

export const exampleParsedSearchQuery = {
  errors: [
    `{"field":"alpha","error":"'range' operation requires 2 args. 7 were provided."}`,
    `{"field":"charlie","error":"'charlie': number conversion failed to provide meaningful value (zZasdfoiwer0sadf = NaN)"}`,
    `{"field":"charlie","error":"'charlie' argument #0: number conversion failed to provide meaningful value (5q1 = NaN),'charlie' argument #1: number conversion failed to provide meaningful value (9r7 = NaN)"}`,
    `{"field":"alpha","error":"'not_a_real_operation' operation not supported"}`,
    `{"field":"not_a_real_prop","error":"'not_a_real_prop' is not a supported property on this resource"}`,
    `{"field":"fake_prop","error":"'fake_prop' is not a supported property on this resource"}`,
  ],
  components: [
    `{"field":"zulu","rawValue":"true","operation":"equal","type":"boolean","value":true}`,
    `{"field":"alpha","rawValue":"field.gt","operation":"gt","type":"string","value":"field.gt"}`,
    `{"field":"bravo","rawValue":"field.gte","operation":"gte","type":"string","value":"field.gte"}`,
    `{"field":"charlie","rawValue":"zZasdfoiwer0sadf","operation":"equal","type":"number"}`,
    `{"field":"charlie","rawValue":"42","operation":"lt","type":"number","value":42}`,
    `{"field":"delta","rawValue":"111","operation":"lte","type":"number","value":111}`,
    `{"field":"echo","rawValue":"field.not","operation":"not","type":"boolean","value":true}`,
    `{"field":"foxtrot","rawValue":"5.1,9.7","operation":"range","type":"number","value":[5.1,9.7]}`,
    `{"field":"golf","rawValue":"braves,marlins,nationals,mets,phillies","operation":"in","type":"string","value":["braves","marlins","nationals","mets","phillies"]}`,
    `{"field":"hotel","rawValue":"braves,marlins,nationals,mets,phillies","operation":"not_in","type":"string","value":["braves","marlins","nationals","mets","phillies"]}`,
    `{"field":"alpha","rawValue":"field.like","operation":"like","type":"string","value":"field.like"}`,
    `{"field":"mike","rawValue":"1.1,2.2,3.3,4.4","operation":"geo_bbox","type":"number","value":[1.1,2.2,3.3,4.4]}`,
    `{"field":"november","rawValue":"1.2,2.3,111000","operation":"geo_radius","type":"number","value":[1.2,2.3,111000]}`,
    `{"field":"alpha","rawValue":"5.1,9.7,9,8,7,6,5","operation":"range","type":"string","value":["5.1","9.7","9","8","7","6","5"]}`,
    `{"field":"charlie","rawValue":"5q1,9r7","operation":"range","type":"number","value":[]}`,
    `{"field":"alpha","rawValue":"yada yada yada","operation":"not_a_real_operation","type":"string","value":"yada yada yada"}`,
    `{"field":"not_a_real_prop","rawValue":"5.1,9.7","operation":"equal","value":{}}`,
    `{"field":"fake_prop","rawValue":"5.1,9.7","operation":"in","value":{}}`,
  ],
};
