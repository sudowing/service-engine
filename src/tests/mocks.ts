import * as Joi from "@hapi/joi";

import * as validation from '../validation';

export const test_keyed_table = Joi.object({
    alpha: validation.JOI_UNIQUE_KEY_COMPONENT_STRING,
    bravo: validation.JOI_UNIQUE_KEY_COMPONENT_NUMBER,
    charlie: validation.JOI_UNIQUE_KEY_COMPONENT_BOOLEAN,
    zulu: Joi.string(),
});
