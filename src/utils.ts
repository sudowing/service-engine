import * as Joi from "@hapi/joi";
import { cloneDeep } from "lodash";
import { UNDERSCORE_IDS, UNDERSCORE_BYKEY, DOT } from "./const";
import * as ts from "./interfaces";

/**
 * @description Parses REST query/body and builds array of standardized query objects that will be used to later define the actual SQL query
 * @param {string} field
 * @param {string} value
 * @param {string} operation
 * @returns {ts.IParamsToQueryString}
 */
const toQueryObject = (
  field: string,
  value: string,
  operation: string
): ts.IParamsToQueryString => ({ field, operation, value });

/**
 * @description
 * @param {ts.IParamsQueryParser} query
 * @returns {ts.IParamsToQueryString[]}
 */
const queryParser = (query: ts.IParamsQueryParser): ts.IParamsToQueryString[] =>
  Object.entries(query).map(([key, value]) => {
    const [field, operation] = key.split(DOT);
    return toQueryObject(field, value, operation);
  });

/**
 * @description
 * @param {string} type
 * @returns {(StringConstructor|NumberConstructor|BooleanConstructor|ts.IDefaultTypeCast)}
 */
const typecastFn = (
  type: string
):
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ts.IDefaultTypeCast => {
  switch (type) {
    case "string":
      return String;
    case "number":
      return Number;
    case "boolean":
      return Boolean;
    default:
      return (arg) => arg;
  }
};

/**
 * @description
 * @param {Joi.Schema} validator
 * @returns {Joi.Schema}
 */
const modifyValidator = (validator: Joi.Schema): Joi.Schema => {
  const weakValidator = cloneDeep(validator);
  weakValidator[UNDERSCORE_IDS][UNDERSCORE_BYKEY].forEach(
    ({ schema: { _flags } }) => {
      if (_flags && _flags.presence) delete _flags.presence;
    }
  );
  return weakValidator;
};

/**
 * @description
 * @param {object} accum
 * @param {*} {id, schema: {type, _flags}}
 * @returns {ts.IValidatorInspectorReport}
 */
const reducerValidatorInspector = (
  accum: object,
  { id, schema }
): ts.IValidatorInspectorReport => ({
  ...accum,
  [id]: {
    type: schema.type,
    required: !!(schema._flags && schema._flags.presence),
    typecast: typecastFn(schema.type),
    validate: (value: string) => schema.validateAsync((typecastFn(schema.type) as any)(value))
  },
});

/**
 * @description Used for swagger generation and for validating user queries. Real validator cannot be used as those are plain objects and may need to validate field multiple times (sql where field <= 5 and >= 12) <-- need to validate values against field twice.
 * @param {Joi.Schema} validator
 * @returns {ts.IValidatorInspectorReport}
 */
const validatorInspector = (
  validator: Joi.Schema
): ts.IValidatorInspectorReport =>
  (Array.from(
    validator[UNDERSCORE_IDS][UNDERSCORE_BYKEY].values()
  ) as any).reduce(reducerValidatorInspector, {});


// const oooo = (validator: Joi.Schema, fields: string[]) =>
//   fields.map(field =>
//     validator[UNDERSCORE_IDS][UNDERSCORE_BYKEY].get(field)
//   )



export {
  toQueryObject,
  queryParser,
  typecastFn,
  validatorInspector,
  modifyValidator,
  reducerValidatorInspector,
};
