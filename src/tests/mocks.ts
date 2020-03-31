import * as Joi from "@hapi/joi";

import * as validation from '../validation';

export const test_keyed_table = Joi.object({
    alpha: validation.JOI_UNIQUE_KEY_COMPONENT_STRING,
    bravo: validation.JOI_UNIQUE_KEY_COMPONENT_NUMBER,
    charlie: validation.JOI_UNIQUE_KEY_COMPONENT_BOOLEAN,
    mike: Joi.string(),
    xray: validation.JOI_GEOFIELD_POINT,
    yankee: validation.JOI_GEOFIELD_POLYGON,
    zulu: validation.JOI_SOFT_DELETE_FLAG,
});

export const test_table = Joi.object({
    alpha: Joi.string().required(),
    bravo: Joi.string(),
    charlie: Joi.number(),
    delta: Joi.number().integer(),
    echo: Joi.boolean(),
    foxtrot: Joi.number(),
    golf: Joi.string(),
    hotel: Joi.string().required(),
    mike: validation.JOI_GEOFIELD_POINT,
    november: validation.JOI_GEOFIELD_POLYGON,
    oscar: validation.JOI_GEOFIELD_POINT,
    papa: validation.JOI_GEOFIELD_POLYGON,
    zulu: validation.JOI_SOFT_DELETE_FLAG,
});

export const initDescribeOriginal = {
    alpha: {
        type: "string",
        required: true,
        geoqueryType: null,
        softDeleteFlag: false
    },
    bravo: {
        type: "number",
        required: true,
        geoqueryType: null,
        softDeleteFlag: false
    },
    charlie: {
        type: "boolean",
        required: true,
        geoqueryType: null,
        softDeleteFlag: false
    },
    mike: {
        type: "string",
        required: false,
        geoqueryType: null,
        softDeleteFlag: false
    },
    xray: {
        type: "number",
        required: false,
        geoqueryType: "point",
        softDeleteFlag: false
    },
    yankee: {
        type: "number",
        required: false,
        geoqueryType: "polygon",
        softDeleteFlag: false
    },
    zulu: {
        type: "boolean",
        required: false,
        geoqueryType: null,
        softDeleteFlag: true
    }
};

export const initDescribeBizarro = {
    alpha: {
        type: "string",
        required: false,
        geoqueryType: null,
        softDeleteFlag: false
    },
    bravo: {
        type: "number",
        required: false,
        geoqueryType: null,
        softDeleteFlag: false
    },
    charlie: {
        type: "boolean",
        required: false,
        geoqueryType: null,
        softDeleteFlag: false
    },
    mike: {
        type: "string",
        required: false,
        geoqueryType: null,
        softDeleteFlag: false
    },
    xray: {
        type: "number",
        required: false,
        geoqueryType: "point",
        softDeleteFlag: false
    },
    yankee: {
        type: "number",
        required: false,
        geoqueryType: "polygon",
        softDeleteFlag: false
    },
    zulu: {
        type: "boolean",
        required: false,
        geoqueryType: null,
        softDeleteFlag: true
    }
};


export const validationInputs = {
    input: {
        number: '123',
        string: 'some_string',
        boolean: 'blah blah blah',
    },
    output: {
        number: 123,
        string: 'some_string',
        boolean: true,
    },
};

export const productConcatErrorMessages = [
    "alpha 'the_black_keys' argument #1",
    "bravo 'the_black_keys' argument #3",
    "charlie 'the_black_keys' argument #5"
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
    "charlie.lt": '42',
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
    "not_a_real_prop": "5.1,9.7",
    "fake_prop.in": "5.1,9.7",
  
};
  
