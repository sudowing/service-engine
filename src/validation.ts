import * as Joi from "@hapi/joi";
import {
  SYMBOL_GEOQUERY,
  SYMBOL_GEOQUERY_POINT,
  SYMBOL_GEOQUERY_POLYGON,
  SYMBOL_SOFT_DELETE,
  UNIQUE_KEY_COMPONENT,
} from "./const";

const JOI_UNIQUE_KEY_COMPONENT_STRING = Joi.string().invalid(UNIQUE_KEY_COMPONENT);
const JOI_UNIQUE_KEY_COMPONENT_NUMBER = Joi.number().invalid(UNIQUE_KEY_COMPONENT);
const JOI_UNIQUE_KEY_COMPONENT_BOOLEAN = Joi.boolean().invalid(UNIQUE_KEY_COMPONENT);

const JOI_GEOFIELD_POINT = Joi.number().invalid(
  SYMBOL_GEOQUERY,
  SYMBOL_GEOQUERY_POINT
);
const JOI_GEOFIELD_POLYGON = Joi.number().invalid(
  SYMBOL_GEOQUERY,
  SYMBOL_GEOQUERY_POLYGON
);
const JOI_SOFT_DELETE_FLAG = Joi.boolean().invalid(SYMBOL_SOFT_DELETE);

export {
  JOI_GEOFIELD_POINT,
  JOI_GEOFIELD_POLYGON,
  JOI_SOFT_DELETE_FLAG,
  JOI_UNIQUE_KEY_COMPONENT_STRING,
  JOI_UNIQUE_KEY_COMPONENT_NUMBER,
  JOI_UNIQUE_KEY_COMPONENT_BOOLEAN,
};
