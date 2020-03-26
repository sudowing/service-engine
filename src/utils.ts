import * as Joi from "@hapi/joi";
import { cloneDeep } from "lodash";
import { SUPPORTED_OPERATIONS, UNDERSCORE_IDS, UNDERSCORE_BYKEY, DOT } from "./const";
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
  operation: string,
  schema: any = undefined,
): ts.IParamsToQueryString => ({
  field,
  operation: operation ? operation : 'equal',
  value,
  schema,
});

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
  type: string,
  schema?: any
):
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ts.IDefaultTypeCast => {

  // only pass schema on qeoquery ops to reduce these checks
  const geoquery = schema && schema._invalids && schema._invalids._values.has('geoquery')

  switch (type) {
    case "string":
      return geoquery ? Number: String;
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
    // validate: (value: string) => schema.validateAsync((typecastFn(schema.type) as any)(value))
    validate: (value: string) => schema.validate((typecastFn(schema.type) as any)(value))
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

const queryParser2 = (validator: Joi.Schema, query: ts.IParamsQueryParser) => {
  const errors = [];
  const components = [];
  Object.entries(query).map(([key, rawValue]) => {
    const [field, op] = key.split(DOT);
    const operation = op ? op : 'equal';

    const { schema } = validator[UNDERSCORE_IDS][UNDERSCORE_BYKEY].get(field) || {};
    const { type } = schema || {};

    const typecast: any = typecastFn(type, schema);

    // if true -- support multiple values
    if (SUPPORTED_OPERATIONS[operation]) {
      const values = rawValue.split(',').map(typecast)
      console.log('**********');
      console.log('oooo.values');
      console.log(operation, field, values);
      console.log('**********');
    }

    // need to handle comma seperated multi values in `in` & etc
    const valid = schema ? schema.validate(typecast(rawValue)) : {}
    const { value, error } = valid;

  // unsupported record fields && sql operations need to go to errors
  if (error || !type || SUPPORTED_OPERATIONS.hasOwnProperty(operation)) errors.push({
      field,
      error: error ? error.message.replace('"value"', `'${field}'`) : !type ? `'${field}' is not a supported property on this resource` : `'${operation}' operation not supported`
    });
    components.push({
      field, rawValue, operation,
      type,
      value
    });

  });

  return {errors, components}

}

export {
  toQueryObject,
  queryParser,
  typecastFn,
  validatorInspector,
  modifyValidator,
  reducerValidatorInspector,
  queryParser2
};
