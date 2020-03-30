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
]