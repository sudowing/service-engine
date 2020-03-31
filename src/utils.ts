import * as Joi from "@hapi/joi";
import { cloneDeep } from "lodash";
import * as cnst from "./const";
import * as ts from "./interfaces";

const castString = (arg) => String(arg);
const castNumber = (arg) => Number(arg);
const castBoolean = (arg) =>
  Boolean(cnst.FALSEY_STRING_VALUES.includes(arg) ? false : arg);
const castOther = (arg) => arg;

/**
 * @description Fn that takes string input of a data type, and returns a Fn that will convert an input into target type. Boolean defines some string inputs as falesy and returns false.
 * @param {string} type
 * @returns {(ts.ITypeCastString
 *   | ts.ITypeCastNumber
 *   | ts.ITypeCastBoolean
 *   | ts.IDefaultTypeCast
 *   | any)}
 */
export const typecastFn = (
  type: string
):
  | ts.ITypeCastString
  | ts.ITypeCastNumber
  | ts.ITypeCastBoolean
  | ts.IDefaultTypeCast
  | any => {
  switch (type) {
    case cnst.STRING:
      return castString;
    case cnst.NUMBER:
      return castNumber;
    case cnst.BOOLEAN:
      return castBoolean;
    default:
      return castOther;
  }
};

/**
 * @description Fn that takes a JOI validator as input and removes the requirement from any fields. This is useful so that validators that define records with PKs can be used more passively to validate queries wanting to `search` on the same record schema.
 * @param {Joi.Schema} validator
 * @returns {Joi.Schema}
 */
export const modifyValidator = (validator: Joi.Schema): Joi.Schema => {
  const weakValidator = cloneDeep(validator);
  weakValidator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].forEach(
    ({ schema: { _flags } }) => {
      if (_flags && _flags.presence) delete _flags.presence;
    }
  );
  return weakValidator;
};

/**
 * @description Reducer Fn that inspects a given schema from fields/keys within a JOI validator object and reports meta information about the specific field. This information is used extensively in this framework for autogeneration of openapi docs, pks to use for unique records, dynamic enabling of geoquery interfaces, and typecasting of query string input before building SQL statements.
 * @param {object} accum
 * @param {*} { id, schema }
 * @returns {ts.IValidatorInspectorReport}
 */
export const reducerValidatorInspector = (
  accum: object,
  { id, schema }
): ts.IValidatorInspectorReport => ({
  ...accum,
  [id]: {
    type: schema.type,
    required: !!(schema._flags && schema._flags.presence),
    geoqueryType:
      schema._invalids && schema._invalids.has(cnst.SYMBOL_GEOQUERY)
        ? schema._invalids.has(cnst.SYMBOL_GEOQUERY_POINT)
          ? "point"
          : "polygon"
        : null,
    softDeleteFlag: !!(
      schema._invalids && schema._invalids.has(cnst.SYMBOL_SOFT_DELETE)
    ),
    typecast: typecastFn(schema.type), // prob need dynamaic assignment for geo fields (need input as numbers and strings?)
    validate: (value: string) =>
      schema.validate((typecastFn(schema.type) as any)(value)),
  },
});

/**
 * @description Used for swagger generation and for validating user queries. Real validator cannot be used as those are plain objects and may need to validate field multiple times (sql where field <= 5 and >= 12) <-- need to validate values against field twice.
 * @param {Joi.Schema} validator
 * @returns {ts.IValidatorInspectorReport}
 */
export const validatorInspector = (
  validator: Joi.Schema
): ts.IValidatorInspectorReport =>
  (Array.from(
    validator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].values()
  ) as any).reduce(reducerValidatorInspector, {});

/**
 * @description Fn that generates error message when value submitted for search is of incorrect data type.
 * @param {Error} error
 * @param {string} field
 * @returns {string}
 */
export const error_message_invalid_value = (
  error: Error,
  field: string
): string => error.message.replace(cnst.QUOTED_VALUE, `'${field}'`);

/**
 * @description Fn that generates error message when GET query produces error for various reasons. Defined errors were generated via JOI validation checks. undefined types occur when trying to query a column that doesn't exist on the record. Final fallback is for when a query operation is called on a field that is not supported.
 * @param {ts.IParamsGenerateSearchQueryError} {error, field, type, operation}
 * @returns {string}
 */
export const generateSearchQueryError = ({
  error,
  field,
  type,
  operation,
}: ts.IParamsGenerateSearchQueryError): string =>
  error
    ? error_message_invalid_value(error, field)
    : !type
    ? `'${field}' is not a supported property on this resource`
    : `'${operation}' operation not supported`;

/**
 * @description Fn that generates verbose error message string when specific number of args not used with a given operation. Only a few operations have specific arg lengths.
 * @param {string} operation
 * @param {any[]} values
 * @returns {string}
 */
export const badArgsLengthError = (operation: string, values: any[]): string =>
  `'${operation}' operation requires ${cnst.DEFINED_ARG_LENGTHS[operation]} args. ${values.length} were provided.`;

/**
 * @description Convenience Fn that builds array of verbose error message strings
 * @param {string} field
 */
export const concatErrorMessages = (field: string) => (
  accum,
  { error },
  i
): string[] => [
  ...accum,
  ...(error
    ? [error.message.replace(cnst.QUOTED_VALUE, `'${field}' argument #${i}`)]
    : []),
];

/**
 * @description Fn that checks to see if length of args meets the needs for a given operation. Only applies to a handful of operations, so majority default to true.
 * @param {string} operation
 * @param {any[]} values
 * @returns {boolean}
 */
export const validArgsforOperation = (
  operation: string,
  values: any[]
): boolean =>
  cnst.DEFINED_ARG_LENGTHS[operation]
    ? cnst.DEFINED_ARG_LENGTHS[operation] === values.length
    : true;

/**
 * @description Some operations on GET queries support operations via `field.operation`. A subset of these operations support multiple values seperated by commas. This `SUPPORTED_OPERATIONS` object holds a map with keys that represent all supported operations and values that define the support for multiple values. `undefined` responses to this function only occur of the operation isn't supported on the field at all.
 * @param {string} operation
 * @returns {(undefined|boolean)}
 */
export const supportMultipleValues = (operation: string): undefined | boolean =>
  cnst.SUPPORTED_OPERATIONS[operation];

/**
 * @description Some operations on GET queries support operations via `field.operation`. This `SUPPORTED_OPERATIONS` object holds a map with keys that represent all supported operations.
 * @param {string} operation
 * @returns {boolean}
 */
export const supportedOperation = (operation: string): boolean =>
  cnst.SUPPORTED_OPERATIONS.hasOwnProperty(operation);

/**
 * @description Fn that parses all GET querystring keys into fields and operations. These are set by the caller via `field.operation` syntax on all GET query string keys for searching. If `.operation` is not provided -- defaults to `.equal`.
 * @param {string} key
 * @returns {ts.IFieldAndOperation}
 */
export const parseFieldAndOperation = (key: string): ts.IFieldAndOperation => {
  const [field, op] = key.split(cnst.DOT);
  return { field, operation: op ? op : cnst.EQUAL };
};

/**
 * @description Heart of the entire system. This Fn takes in a JOI validator and a query object (which is mostly the `ctx.request.query` -- sans a couple keys) and submits both for processing. Search interfaces, fields & operations, are derived from the JOI validators, values from query object are typecasted to data types (if possible) using the types of each field from the JOI validator. Some query operations support multiple values seperated by commas, and this value parsing to arrays is also done here. The output is an array of errors if any exist, so request can be stopped before submitting to database, and an array of component objects that will be used to generated the SQL query using knex query builder if there are no errors.
 * @param {Joi.Schema} validator
 * @param {ts.IParamsSearchQueryParser} query
 * @returns {ts.ISearchQueryResponse}
 */
export const searchQueryParser = (
  validator: Joi.Schema,
  query: ts.IParamsSearchQueryParser
): ts.ISearchQueryResponse => {
  const errors = [];
  const components = [];
  Object.entries(query).forEach(([key, rawValue]) => {
    const { field, operation } = parseFieldAndOperation(key);
    const { schema } =
      validator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].get(field) || {};
    const { type } = schema || {}; // all fields have types. if undefined -- simply not a field on the resource
    const record = { field, rawValue, operation, type };
    const typecast: any = typecastFn(type);
    if (supportMultipleValues(operation)) {
      const values = rawValue.split(cnst.COMMA).map(typecast);
      if (!validArgsforOperation(operation, values))
        errors.push({ field, error: badArgsLengthError(operation, values) });
      const validatedValues = schema
        ? values.map((value) => schema.validate(value))
        : [];
      const error = validatedValues
        .reduce(concatErrorMessages(field), [])
        .join(cnst.COMMA);
      if (error) errors.push({ field, error });
      components.push({ ...record, value: values });
    } else {
      const { value, error } = schema
        ? schema.validate(typecast(rawValue))
        : ({} as any);
      if (error || !type || !supportedOperation(operation)) {
        errors.push({
          field,
          error: generateSearchQueryError({ error, field, type, operation }),
        });
      }
      components.push({ ...record, value });
    }
  });
  return { errors, components };
};
